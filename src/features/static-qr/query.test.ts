import { describe, expect, it } from 'vitest'
import { can } from '@/shared/auth/access'
import { readKeys } from '@/shared/api/read-keys'
import { endpoints } from '@/shared/contracts/endpoints'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { HttpTransport } from '@/shared/api/http'
import type { ProtectedReadBridge } from '@/shared/api/protected-read'
import type { ProtectedReadContextValue } from '@/shared/api/ProtectedReadContext'
import { createStaticQrQueryOptions } from './query'
import type { StaticQrFilters } from './page-state'

const scope: ReadScope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const filters = { search: '', page: 0, size: 20 as const }
const page = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => { resolve = yes })
  return { promise, resolve }
}

function session(permissions: string[], sessionScopeId = 'session-a') {
  return { phase: 'authenticated', sessionScopeId, profile: { permissions } } as unknown as
    ReturnType<ProtectedReadContextValue['getSessionSnapshot']>
}

function setup(overrides: {
  permission?: boolean
  authReady?: boolean
  terminalConfirmed?: boolean
  transport?: HttpTransport | null
  currentScope?: () => ReadScope
  getSessionSnapshot?: ProtectedReadContextValue['getSessionSnapshot']
  bridge?: ProtectedReadBridge
  filters?: StaticQrFilters
} = {}) {
  let calls = 0
  let received: unknown = null
  const bridge: ProtectedReadBridge = overrides.bridge ?? { get: async (request) => {
    calls++
    received = request
    return page as never
  } }
  const options = createStaticQrQueryOptions({
    scope, currentScope: overrides.currentScope ?? (() => scope), filters: overrides.filters ?? filters,
    staticReadAllowed: overrides.permission ?? true,
    authReady: overrides.authReady ?? true,
    terminalConfirmed: overrides.terminalConfirmed ?? true,
    transport: overrides.transport === undefined ? ({} as HttpTransport) : overrides.transport,
    bridge,
    getSessionSnapshot: overrides.getSessionSnapshot ?? (() => session(['GET_STATIC_QRS'])),
  })
  return { options, calls: () => calls, received: () => received }
}

describe('static QR safe read boundary', () => {
  it('forwards supported applied filters through the unchanged protected endpoint and blocks unconfirmed reads', async () => {
    const applied = { ...filters, merchantId: '1', terminalId: 'T-Exact', regionId: '3', districtId: '4', search: '  QR-1  ', page: 2 }
    const read = setup({ filters: applied })
    await read.options.queryFn({ signal: new AbortController().signal })
    expect(read.received()).toMatchObject({ endpoint: endpoints.staticQrs,
      query: { merchantId: '1', terminalId: 'T-Exact', regionId: '3', districtId: '4', search: 'QR-1', page: '2', size: '20' } })
    expect(read.options.queryKey).toEqual(readKeys.staticQrs(scope, applied.terminalId, applied.page, applied.size, applied))
    const blocked = setup({ filters: applied, terminalConfirmed: false })
    await expect(blocked.options.queryFn({ signal: new AbortController().signal })).rejects.toThrow()
    expect(blocked.calls()).toBe(0)
  })
  it('keeps exact endpoint and independent static authority', () => {
    expect(endpoints.staticQrs).toMatchObject({ service: 'web', method: 'GET', path: '/static-qrs/get-all', body: 'none' })
    const access = { kind: 'authenticated' as const, permissions: new Set(['GET_STATIC_QRS']) }
    expect(can(access, 'staticQr.read', false)).toBe(true)
    expect(can(access, 'dynamicQr.read', false)).toBe(false)
    expect(can(access, 'dashboard.read', false)).toBe(false)
  })

  it('disables missing permission, unavailable transport or unconfirmed applied terminal', async () => {
    for (const overrides of [{ permission: false }, { authReady: false }, { transport: null }, { terminalConfirmed: false }]) {
      const read = setup(overrides)
      expect(read.options.enabled).toBe(false)
      await expect(read.options.queryFn({ signal: new AbortController().signal })).rejects.toThrow()
      expect(read.calls()).toBe(0)
    }
  })

  it('runs unfiltered static-only read without terminal lookup grant', async () => {
    const read = setup()
    expect(read.options.enabled).toBe(true)
    expect(read.options.queryKey).toEqual(readKeys.staticQrs(scope, undefined, 0, 20))
    expect(await read.options.queryFn({ signal: new AbortController().signal })).toEqual(page)
    expect(read.calls()).toBe(1)
    expect(read.received()).toMatchObject({ endpoint: endpoints.staticQrs, query: { page: '0', size: '20' } })
  })

  it('keys source, session, permission revision, terminal, page and size separately', () => {
    const original = readKeys.staticQrs(scope, undefined, 0, 10)
    for (const key of [
      readKeys.staticQrs({ ...scope, source: 'demo' }, undefined, 0, 10),
      readKeys.staticQrs({ ...scope, sessionScopeId: 'session-b' }, undefined, 0, 10),
      readKeys.staticQrs({ ...scope, accessRevision: 2 }, undefined, 0, 10),
      readKeys.staticQrs(scope, 'terminal-a', 0, 10),
      readKeys.staticQrs(scope, undefined, 1, 10),
      readKeys.staticQrs(scope, undefined, 0, 25),
    ]) expect(key).not.toEqual(original)
  })

  it('suppresses late results after session, source or permission revision changes', async () => {
    for (const replacement of [
      { ...scope, sessionScopeId: 'session-b' }, { ...scope, source: 'demo' as const },
      { ...scope, accessRevision: 2 },
    ]) {
      const gate = deferred<typeof page>()
      let current = scope
      const bridge = { get: () => gate.promise } as unknown as ProtectedReadBridge
      const read = setup({ bridge, currentScope: () => current })
      const pending = read.options.queryFn({ signal: new AbortController().signal })
      current = replacement
      gate.resolve(page)
      await expect(pending).rejects.toThrow()
    }
  })

  it('rejects permission loss after the GET returns', async () => {
    const gate = deferred<typeof page>()
    let permissions = ['GET_STATIC_QRS']
    const bridge = { get: () => gate.promise } as unknown as ProtectedReadBridge
    const read = setup({ bridge, getSessionSnapshot: () => session(permissions) })
    const pending = read.options.queryFn({ signal: new AbortController().signal })
    permissions = []
    gate.resolve(page)
    await expect(pending).rejects.toThrow()
  })

  it('preserves safe read query policy', () => {
    const { options } = setup()
    expect(options).toMatchObject({ retry: false, staleTime: 30_000,
      refetchOnWindowFocus: false, refetchOnReconnect: false })
  })
})
