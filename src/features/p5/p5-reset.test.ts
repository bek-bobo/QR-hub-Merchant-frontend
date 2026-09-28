import { describe, expect, it } from 'vitest'
import { can } from '@/shared/auth/access'
import { createActionRegistry } from '@/shared/api/one-dispatch-action'
import { readKeys } from '@/shared/api/read-keys'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { P5Row } from '@/shared/contracts/p5-read'
import { buildP5ResetRequest, createP5ResetController, createProtectedP5ResetPort, decodeP5ResetSuccess, invalidateCurrentP5Lists, isP5ResetEligible, p5ResetIntentKey, type P5ResetPort } from './p5-reset'

const scope: ReadScope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const row: P5Row = {
  deviceId: '00 Ab/%2F', description: 'Front desk', deviceStatus: 0, terminalId: 'terminal-a',
  terminalName: 'Terminal A', terminalType: 'P5', merchantName: 'Merchant A', staticQrId: null,
  staticQrLink: null, staticQrStatus: 1, createdAt: '2026-09-23T12:00:00',
}
const confirmed = { success: true, data: null }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function setup(overrides: Partial<Parameters<typeof createP5ResetController>[0]> = {}) {
  let currentScope = scope
  let visible: P5Row | null = row
  let read = true
  let reset = true
  let sends = 0
  let invalidations = 0
  const port: P5ResetPort = { reset: async () => { sends += 1; return confirmed } }
  const controller = createP5ResetController({
    currentScope: () => currentScope,
    canRead: () => read,
    canReset: () => reset,
    currentRow: (deviceId) => visible?.deviceId === deviceId ? visible : null,
    port: () => port,
    invalidateConfirmed: async () => { invalidations += 1 },
    ...overrides,
  })
  return { controller, port, get sends() { return sends }, get invalidations() { return invalidations },
    setScope: (next: ReadScope) => { currentScope = next }, setVisible: (next: P5Row | null) => { visible = next },
    setRead: (next: boolean) => { read = next }, setReset: (next: boolean) => { reset = next } }
}

describe('P5 reset contract and controller', () => {
  it('maps only exact RESET_P5_PIN and keeps reset independent from list authority', () => {
    expect(can({ kind: 'authenticated', permissions: new Set(['RESET_P5_PIN']) }, 'p5.resetPin', false)).toBe(true)
    expect(can({ kind: 'authenticated', permissions: new Set(['GET_P5']) }, 'p5.resetPin', false)).toBe(false)
    expect(can({ kind: 'authenticated', permissions: new Set(['RESET_P5_PIN']) }, 'p5.read', false)).toBe(false)
  })

  it('accepts exact status zero only and does not confuse static QR status', () => {
    expect(isP5ResetEligible(row)).toBe(true)
    expect(isP5ResetEligible({ ...row, deviceStatus: 1 })).toBe(false)
    expect(isP5ResetEligible({ ...row, deviceStatus: 777 })).toBe(false)
    expect(isP5ResetEligible({ ...row, deviceStatus: null })).toBe(false)
    expect(isP5ResetEligible({ ...row, deviceStatus: Number.NaN })).toBe(false)
    expect(isP5ResetEligible({ ...row, deviceStatus: 1, staticQrStatus: 0 })).toBe(false)
  })

  it('builds one exactly encoded bodyless path segment without extra IDs', () => {
    expect(buildP5ResetRequest(row.deviceId)).toEqual({
      deviceId: '00 Ab/%2F', method: 'POST', path: '/p5/reset-pin/00%20Ab%2F%252F', body: undefined,
    })
    const serialized = JSON.stringify(buildP5ResetRequest(row.deviceId))
    expect(serialized).not.toContain('merchantId')
    expect(serialized).not.toContain('terminalId')
    expect(buildP5ResetRequest('')).toBeNull()
  })

  it('confirms only the exact injected success envelope', () => {
    expect(decodeP5ResetSuccess(confirmed)).toBeUndefined()
    for (const payload of [{}, { success: true }, { success: false, data: null }, { success: true, data: {} }, { success: true, data: null, error: {} }]) {
      expect(() => decodeP5ResetSuccess(payload)).toThrow()
    }
  })

  it('routes an injected dispatch through protectedMutation and preserves pre-dispatch NOT_SENT', async () => {
    let dispatches = 0
    const protectedMutation = async <T,>(operation: (context: { accessToken: string; signal: AbortSignal }) => Promise<T>) => ({
      status: 'success' as const,
      data: await operation({ accessToken: 'opaque', signal: new AbortController().signal }),
    })
    const port = createProtectedP5ResetPort({
      protectedMutation,
      recheck: () => true,
      dispatch: async () => { dispatches += 1; return confirmed },
    })
    expect(await port.reset(buildP5ResetRequest(row.deviceId)!, scope)).toEqual(confirmed)
    expect(dispatches).toBe(1)

    const blocked = createProtectedP5ResetPort({ protectedMutation, recheck: () => false, dispatch: async () => { dispatches += 1 } })
    await expect(blocked.reset(buildP5ResetRequest(row.deviceId)!, scope)).rejects.toThrow('not called')
    expect(dispatches).toBe(1)
  })

  it('opens and cancels without dispatch, then explicitly confirms exactly once', async () => {
    const subject = setup()
    expect(subject.controller.request(row)).toBe(true)
    expect(subject.controller.getState().dialogOpen).toBe(true)
    expect(subject.sends).toBe(0)
    subject.controller.dismiss()
    expect(subject.sends).toBe(0)
    expect(subject.controller.request(row)).toBe(true)
    expect((await subject.controller.confirm()).kind).toBe('confirmed')
    expect((await subject.controller.confirm()).kind).toBe('not-sent')
    expect(subject.sends).toBe(1)
  })

  it('keeps list usable but reset unsent when read, permission, port, or eligibility is missing', async () => {
    for (const subject of [
      setup({ canRead: () => false }), setup({ canReset: () => false }), setup({ port: () => null }),
      setup({ currentRow: () => ({ ...row, deviceStatus: 1 }) }),
    ]) {
      expect(subject.controller.request(row)).toBe(false)
      expect(subject.sends).toBe(0)
    }
  })

  it('rechecks target, list/reset permissions, port readiness and scope before dispatch', async () => {
    for (const change of ['target', 'read', 'permission', 'port', 'scope'] as const) {
      let currentScope = scope
      let currentRow: P5Row | null = row
      let read = true
      let reset = true
      let available = true
      let actualSends = 0
      const port: P5ResetPort = { reset: async () => { actualSends += 1; return confirmed } }
      const subject = setup({
        currentScope: () => currentScope,
        currentRow: () => currentRow,
        canRead: () => read,
        canReset: () => reset,
        port: () => available ? port : null,
        prepare: async () => {
        if (change === 'target') currentRow = { ...row, deviceStatus: 1 }
        if (change === 'read') read = false
        if (change === 'permission') reset = false
        if (change === 'port') available = false
        if (change === 'scope') currentScope = { ...scope, sessionScopeId: 'session-b' }
        return true
      } })
      expect(subject.controller.request(row)).toBe(true)
      expect((await subject.controller.confirm()).kind).not.toBe('confirmed')
      expect(actualSends).toBe(0)
    }
  })

  it('retains one same-device pending intent across close, reopen and duplicate rows', async () => {
    const gate = deferred<unknown>()
    let sends = 0
    const port: P5ResetPort = { reset: () => { sends += 1; return gate.promise } }
    const subject = setup({ port: () => port })
    const registry = createActionRegistry()
    const key = p5ResetIntentKey(scope, row.deviceId)
    const retained = registry.getOrCreate(key, () => subject.controller)
    expect(registry.getOrCreate(key, () => setup().controller)).toBe(retained)
    expect(retained.request(row)).toBe(true)
    const flight = retained.confirm()
    retained.dismiss()
    expect(retained.request({ ...row })).toBe(true)
    expect((await retained.confirm()).kind).toBe('not-sent')
    expect(sends).toBe(1)
    gate.resolve(confirmed)
    expect((await flight).kind).toBe('confirmed')
  })

  it('keeps ambiguous dispatch UNKNOWN, does not replay, and requires acknowledgement for a new intent', async () => {
    let sends = 0
    const port: P5ResetPort = { reset: async () => { sends += 1; throw Error('lost response') } }
    const subject = setup({ port: () => port })
    subject.controller.request(row)
    expect((await subject.controller.confirm()).kind).toBe('unknown')
    expect(subject.controller.getState().outcome.kind).toBe('unknown')
    await invalidateCurrentP5Lists({ invalidateQueries: async () => undefined } as never, scope, true)
    expect(subject.controller.getState().outcome.kind).toBe('unknown')
    expect(subject.controller.request(row)).toBe(true)
    expect((await subject.controller.confirm()).kind).toBe('not-sent')
    expect(sends).toBe(1)
    expect(subject.controller.beginNewIntent(false)).toBe(false)
    expect(subject.controller.getState().outcome.kind).toBe('unknown')
    expect(subject.controller.beginNewIntent(true)).toBe(true)
  })

  it('isolates a late old-scope completion from UI and invalidation', async () => {
    const gate = deferred<unknown>()
    const port: P5ResetPort = { reset: () => gate.promise }
    const subject = setup({ port: () => port })
    subject.controller.request(row)
    const flight = subject.controller.confirm()
    subject.setScope({ ...scope, accessRevision: 2 })
    gate.resolve(confirmed)
    expect((await flight).kind).toBe('stale')
    expect(subject.invalidations).toBe(0)
    expect(subject.controller.getState().outcome.kind).toBe('idle')
  })

  it('keeps CONFIRMED when current-scope P5 invalidation fails', async () => {
    const subject = setup({ invalidateConfirmed: async () => { throw Error('refetch failed') } })
    subject.controller.request(row)
    expect((await subject.controller.confirm()).kind).toBe('confirmed')
    expect(subject.controller.getState().outcome.kind).toBe('confirmed')
    expect(subject.controller.getState().refresh).toBe('failed')
  })

  it('invalidates only current-scope P5 list variants', async () => {
    const filters = { search: '', page: 0, size: 10 as const }
    const keys = [
      readKeys.p5List(scope, filters), readKeys.p5List(scope, { ...filters, status: 0 }),
      readKeys.dashboard(scope, { fromDate: '2026-09-01', toDate: '2026-09-23' }),
      readKeys.p5List({ ...scope, accessRevision: 2 }, filters),
    ]
    const selected: (readonly unknown[])[] = []
    await invalidateCurrentP5Lists({ invalidateQueries: async ({ predicate }: { predicate: (query: { queryKey: readonly unknown[] }) => boolean }) => {
      selected.push(...keys.filter((queryKey) => predicate({ queryKey })))
    } } as never, scope, true)
    expect(selected).toEqual(keys.slice(0, 2))
  })
})
