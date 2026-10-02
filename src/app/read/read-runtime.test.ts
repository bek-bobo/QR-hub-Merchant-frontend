import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { AccessContextValue } from '@/shared/auth/access'
import type {
  DashboardView,
  ReadScope,
} from '@/shared/contracts/merchant-read'
import { readKeys } from '@/shared/api/read-keys'
import {
  cleanupReadQueries,
  createReadRuntime,
  StaleReadScopeError,
} from './read-runtime'
import { ReadConfigurationError, type LiveReadApi } from './createLiveReadApi'

const dashboard = {} as DashboardView
const filters = { fromDate: '2026-09-01', toDate: '2026-09-15' }

function configuredLiveReadApi(handler = vi.fn().mockResolvedValue(dashboard)) {
  const api: LiveReadApi = {
    registrations: {
      dashboard: { kind: 'configured' },
      dynamicQr: { kind: 'configured' },
      terminalLookup: { kind: 'configured' },
      terminalList: { kind: 'configured' },
      bankAccountList: { kind: 'configured' },
      cashierList: { kind: 'configured' },
      merchantLookup: { kind: 'configured' },
      bankAccountLookup: { kind: 'configured' },
      regionLookup: { kind: 'configured' },
      districtLookup: { kind: 'configured' },
      p5List: { kind: 'configured' },
    },
    dashboard: handler,
    dynamicQrs: vi.fn(),
    dynamicQrStats: vi.fn(),
    terminals: vi.fn(),
    terminalsForMerchant: vi.fn(),
    terminalList: vi.fn(),
    bankAccountList: vi.fn(),
    cashierList: vi.fn(),
    merchantLookup: vi.fn(),
    bankAccountLookup: vi.fn(),
    regionLookup: vi.fn(),
    districtLookup: vi.fn(),
    p5List: vi.fn().mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 }),
  }
  return { api, handler }
}

describe('read runtime', () => {
  it('uses exact geography permissions, prevents parentless district requests, and leaves unfiltered terminals independent', async () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 'geo', accessRevision: 1 }
    let access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_TERMINAL']) }
    const { api } = configuredLiveReadApi()
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const signal = new AbortController().signal
    expect(runtime.regionLookupOptions().enabled).toBe(false)
    expect(runtime.districtLookupOptions('3').enabled).toBe(false)
    expect(runtime.terminalListOptions({ search: '', page: 0, size: 20 }).enabled).toBe(true)
    await expect(runtime.regionLookupOptions().queryFn({ signal })).rejects.toMatchObject({ name: 'ReadAccessError' })
    expect(api.regionLookup).not.toHaveBeenCalled()
    access = { kind: 'authenticated', permissions: new Set(['GET_DROPDOWN_REGIONS', 'GET_DROPDOWN_DISTRICTS']) }
    expect(runtime.regionLookupOptions().enabled).toBe(true)
    expect(runtime.districtLookupOptions('3').enabled).toBe(true)
    expect(runtime.districtLookupOptions().enabled).toBe(false)
    await expect(runtime.districtLookupOptions().queryFn({ signal })).rejects.toBeInstanceOf(ReadConfigurationError)
    expect(api.districtLookup).not.toHaveBeenCalled()
    await runtime.regionLookupOptions().queryFn({ signal })
    await runtime.districtLookupOptions(' 3 ').queryFn({ signal })
    expect(api.regionLookup).toHaveBeenCalledWith(signal)
    expect(api.districtLookup).toHaveBeenCalledWith('3', signal)
    expect(runtime.districtLookupOptions('3').queryKey).not.toEqual(runtime.districtLookupOptions('4').queryKey)
  })

  it('requires confirmed applied region and matching district before entering the Terminal list port', async () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 'geo', accessRevision: 1 }
    const access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_TERMINAL']) }
    const { api } = configuredLiveReadApi()
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const filters = { regionId: '3', districtId: '4', search: '', page: 0, size: 20 } as const
    const valid = { region: { lookupState: 'ready' as const, optionIds: ['3'] },
      district: { lookupParentId: '3', lookupState: 'ready' as const, optionIds: ['4'] } }
    expect(runtime.terminalListOptions(filters, undefined, valid).enabled).toBe(true)
    const cases = [undefined, { ...valid, region: { ...valid.region, optionIds: [] } },
      { ...valid, district: { ...valid.district, lookupParentId: '9' } },
      { ...valid, district: { ...valid.district, optionIds: [] } },
      { ...valid, district: { ...valid.district, lookupState: 'error' as const } }]
    for (const geography of cases) {
      const blocked = runtime.terminalListOptions(filters, undefined, geography)
      expect(blocked.enabled).toBe(false)
      await expect(blocked.queryFn({ signal: new AbortController().signal })).rejects.toBeInstanceOf(ReadConfigurationError)
    }
    expect(api.terminalList).not.toHaveBeenCalled()
    expect(runtime.terminalListOptions({ ...filters, regionId: undefined }, undefined, valid).enabled).toBe(false)
  })

  it('removes both geography lookup caches when the previous read scope is cleaned up', async () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 'geo', accessRevision: 1 }
    const client = new QueryClient()
    const keys = [readKeys.regionLookup(scope), readKeys.districtLookup(scope, '3'), readKeys.districtLookup(scope, '4')]
    keys.forEach((key) => client.setQueryData(key, []))
    const current = readKeys.regionLookup({ ...scope, sessionScopeId: 'new' })
    client.setQueryData(current, [])
    await cleanupReadQueries(client, scope)
    keys.forEach((key) => expect(client.getQueryData(key)).toBeUndefined())
    expect(client.getQueryData(current)).toEqual([])
    client.clear()
  })
  it('gates stats with dynamic QR permission and forwards the request policy and signal', async () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 'a', accessRevision: 1 }
    let access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_DYNAMIC_QRS']) }
    const { api } = configuredLiveReadApi()
    const handler = vi.fn().mockResolvedValue({})
    api.dynamicQrStats = handler
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const options = runtime.dynamicQrStatsOptions(filters)
    expect(options).toMatchObject({ enabled: true, retry: false, staleTime: 30_000, refetchOnWindowFocus: false, refetchOnReconnect: false })
    expect(options.queryKey).toEqual(readKeys.dynamicQrStats(scope, filters))
    const signal = new AbortController().signal
    await options.queryFn({ signal })
    expect(handler).toHaveBeenCalledWith(filters, signal)
    access = { kind: 'authenticated', permissions: new Set() }
    expect(runtime.dynamicQrStatsOptions(filters).enabled).toBe(false)
    await expect(options.queryFn({ signal })).rejects.toMatchObject({ name: 'ReadAccessError' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('rejects stats that resolve after the scope changes', async () => {
    let scope: ReadScope = { source: 'live', sessionScopeId: 'a', accessRevision: 1 }
    const access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_DYNAMIC_QRS']) }
    const { api } = configuredLiveReadApi()
    let resolve!: () => void
    api.dynamicQrStats = () => new Promise((done) => { resolve = () => done({} as Awaited<ReturnType<LiveReadApi['dynamicQrStats']>>) })
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const pending = runtime.dynamicQrStatsOptions(filters).queryFn({ signal: new AbortController().signal })
    scope = { ...scope, accessRevision: 2 }
    resolve()
    await expect(pending).rejects.toBeInstanceOf(StaleReadScopeError)
  })
  it('uses the focused no-retry query policy', () => {
    const scope: ReadScope = {
      source: 'live',
      sessionScopeId: 'session-a',
      accessRevision: 1,
    }
    const access: AccessContextValue = {
      kind: 'authenticated',
      permissions: new Set(['GET_DASHBOARD']),
    }
    const { api } = configuredLiveReadApi()
    const options = createReadRuntime(api, () => ({ scope, access }))
      .dashboardOptions(filters)

    expect(options).toMatchObject({
      enabled: true,
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    })
    expect(options).not.toHaveProperty('placeholderData')
    expect(options).not.toHaveProperty('keepPreviousData')
    expect(options).not.toHaveProperty('refetchInterval')
  })

  it('blocks denied execution even when queryFn is called manually', async () => {
    const scope: ReadScope = {
      source: 'live',
      sessionScopeId: 'session-a',
      accessRevision: 1,
    }
    const access: AccessContextValue = {
      kind: 'authenticated',
      permissions: new Set(),
    }
    const { api, handler } = configuredLiveReadApi()
    const options = createReadRuntime(api, () => ({ scope, access }))
      .dashboardOptions(filters)

    expect(options.enabled).toBe(false)
    await expect(
      options.queryFn({ signal: new AbortController().signal } as never),
    ).rejects.toMatchObject({ name: 'ReadAccessError' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('rejects a slow result after the session scope changes', async () => {
    let resolve!: (value: DashboardView) => void
    const slow = new Promise<DashboardView>((done) => {
      resolve = done
    })
    const { api } = configuredLiveReadApi(vi.fn().mockReturnValue(slow))
    let scope: ReadScope = {
      source: 'live',
      sessionScopeId: 'session-a',
      accessRevision: 1,
    }
    const access: AccessContextValue = {
      kind: 'authenticated',
      permissions: new Set(['GET_DASHBOARD']),
    }
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const pending = runtime.api.dashboard(
      filters,
      new AbortController().signal,
    )
    scope = { ...scope, sessionScopeId: 'session-b' }
    resolve(dashboard)

    await expect(pending).rejects.toBeInstanceOf(StaleReadScopeError)
  })

  it('removes only read queries during scope cleanup', async () => {
    const queryClient = new QueryClient()
    const scope: ReadScope = {
      source: 'live',
      sessionScopeId: 'session-a',
      accessRevision: 1,
    }
    queryClient.setQueryData(readKeys.dashboard(scope, filters), dashboard)
    queryClient.setQueryData(readKeys.staticQrs(scope, 'terminal-a', 0, 10), { content: [] })
    queryClient.setQueryData(readKeys.terminalList(scope, { search: '', page: 0, size: 10 }), { content: [] })
    queryClient.setQueryData(readKeys.bankAccountList(scope, { search: '', page: 0, size: 10 }), { content: [] })
    queryClient.setQueryData(readKeys.cashierList(scope, { search: '', page: 0, size: 10 }), { content: [] })
    queryClient.setQueryData(readKeys.bankAccountLookup(scope, '2'), [])
    queryClient.setQueryData(readKeys.p5List(scope, { search: '', page: 0, size: 10 }), { content: [] })
    queryClient.setQueryData(['live', 'auth-preview'], 'preserve')

    await cleanupReadQueries(queryClient, scope)

    expect(queryClient.getQueryData(readKeys.dashboard(scope, filters)))
      .toBeUndefined()
    expect(queryClient.getQueryData(readKeys.staticQrs(scope, 'terminal-a', 0, 10)))
      .toBeUndefined()
    expect(queryClient.getQueryData(readKeys.terminalList(scope, { search: '', page: 0, size: 10 }))).toBeUndefined()
    expect(queryClient.getQueryData(readKeys.bankAccountList(scope, { search: '', page: 0, size: 10 }))).toBeUndefined()
    expect(queryClient.getQueryData(readKeys.cashierList(scope, { search: '', page: 0, size: 10 }))).toBeUndefined()
    expect(queryClient.getQueryData(readKeys.bankAccountLookup(scope, '2'))).toBeUndefined()
    expect(queryClient.getQueryData(readKeys.p5List(scope, { search: '', page: 0, size: 10 }))).toBeUndefined()
    expect(queryClient.getQueryData(['live', 'auth-preview'])).toBe('preserve')
  })

  it('keeps list and dropdown authorities independent before dispatch', async () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 's', accessRevision: 1 }
    const access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_TERMINAL']) }
    const { api } = configuredLiveReadApi()
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const filters = { search: '', page: 0, size: 10 } as const
    expect(runtime.terminalListOptions(filters).enabled).toBe(true)
    expect(runtime.terminalLookupOptions().enabled).toBe(false)
    await expect(runtime.terminalLookupOptions().queryFn({ signal: new AbortController().signal })).rejects.toMatchObject({ name: 'ReadAccessError' })
    expect(vi.mocked(api.terminalsForMerchant)).not.toHaveBeenCalled()
  })

  it('blocks unauthorized management list dispatch even when its query function is invoked', async () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 's', accessRevision: 1 }
    const access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_DROPDOWN_TERMINALS']) }
    const { api } = configuredLiveReadApi()
    const options = createReadRuntime(api, () => ({ scope, access })).terminalListOptions({ search: '', page: 0, size: 10 })
    expect(options.enabled).toBe(false)
    await expect(options.queryFn({ signal: new AbortController().signal })).rejects.toMatchObject({ name: 'ReadAccessError' })
    expect(vi.mocked(api.terminalList)).not.toHaveBeenCalled()
  })

  it('pauses a filtered list when its lookup cannot confirm the applied child', () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 's', accessRevision: 1 }
    const access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_TERMINAL']) }
    const { api } = configuredLiveReadApi()
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    expect(runtime.terminalListOptions({ merchantId: '1', bankAccountId: '3', search: '', page: 0, size: 10 }, { lookupParentId: '2', lookupState: 'ready', optionIds: ['3'] }).enabled).toBe(false)
    expect(runtime.terminalListOptions({ search: '', page: 0, size: 10 }).enabled).toBe(true)
  })

  it('keeps bank-account list and merchant/bank dropdown authorities independent', async () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 's', accessRevision: 1 }
    let access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_BANK_ACCOUNTS']) }
    const { api } = configuredLiveReadApi()
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const options = runtime.bankAccountListOptions({ search: '', page: 0, size: 10 })
    expect(options.enabled).toBe(true)
    expect(runtime.merchantLookupOptions().enabled).toBe(false)
    expect(runtime.bankAccountLookupOptions().enabled).toBe(false)
    await options.queryFn({ signal: new AbortController().signal })
    expect(vi.mocked(api.bankAccountList)).toHaveBeenCalledOnce()
    expect(vi.mocked(api.merchantLookup)).not.toHaveBeenCalled()
    expect(vi.mocked(api.bankAccountLookup)).not.toHaveBeenCalled()

    access = { kind: 'authenticated', permissions: new Set(['GET_DROPDOWN_MERCHANTS']) }
    const denied = runtime.bankAccountListOptions({ search: '', page: 0, size: 10 })
    expect(denied.enabled).toBe(false)
    await expect(denied.queryFn({ signal: new AbortController().signal })).rejects.toMatchObject({ name: 'ReadAccessError' })
    expect(vi.mocked(api.bankAccountList)).toHaveBeenCalledOnce()
  })

  it('keeps cashier list read independent of lookups and write grants', async () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 's', accessRevision: 1 }
    let access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_CASHIERS']) }
    const { api } = configuredLiveReadApi()
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const filters = { search: '', page: 0, size: 10 } as const
    expect(runtime.cashierListOptions(filters).enabled).toBe(true)
    expect(runtime.merchantLookupOptions().enabled).toBe(false)
    expect(runtime.terminalLookupOptions().enabled).toBe(false)
    await runtime.cashierListOptions(filters).queryFn({ signal: new AbortController().signal })
    expect(vi.mocked(api.cashierList)).toHaveBeenCalledOnce()
    expect(vi.mocked(api.merchantLookup)).not.toHaveBeenCalled()
    expect(vi.mocked(api.terminalsForMerchant)).not.toHaveBeenCalled()

    access = { kind: 'authenticated', permissions: new Set(['CREATE_CASHIER', 'ASSIGN_TERMINALS', 'UNASSIGN_TERMINAL']) }
    const denied = runtime.cashierListOptions(filters)
    expect(denied.enabled).toBe(false)
    await expect(denied.queryFn({ signal: new AbortController().signal })).rejects.toMatchObject({ name: 'ReadAccessError' })
    expect(vi.mocked(api.cashierList)).toHaveBeenCalledOnce()
  })

  it('pauses a cashier terminal filter from an old merchant but keeps unfiltered read enabled', () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 's', accessRevision: 1 }
    const access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_CASHIERS']) }
    const { api } = configuredLiveReadApi()
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const blocked = runtime.cashierListOptions({ merchantId: '2', terminalId: 'term-3', search: '', page: 0, size: 10 }, { lookupParentId: '1', lookupState: 'ready', optionIds: ['term-3'] })
    expect(blocked.enabled).toBe(false)
    expect(runtime.cashierListOptions({ search: '', page: 0, size: 10 }).enabled).toBe(true)
    expect(vi.mocked(api.cashierList)).not.toHaveBeenCalled()
  })

  it('scopes P5 reads to GET_P5 and rejects a stale response after session replacement', async () => {
    let resolve!: (value: Awaited<ReturnType<LiveReadApi['p5List']>>) => void
    const slow = new Promise<Awaited<ReturnType<LiveReadApi['p5List']>>>((done) => { resolve = done })
    let scope: ReadScope = { source: 'live', sessionScopeId: 'p5-a', accessRevision: 1 }
    const access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_P5']) }
    const { api } = configuredLiveReadApi()
    vi.mocked(api.p5List).mockReturnValue(slow)
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const filters = { search: '', page: 0, size: 10 } as const
    expect(runtime.p5ListOptions(filters).enabled).toBe(true)
    const pending = runtime.p5ListOptions(filters).queryFn({ signal: new AbortController().signal })
    scope = { ...scope, sessionScopeId: 'p5-b' }
    resolve({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 })
    await expect(pending).rejects.toBeInstanceOf(StaleReadScopeError)
  })

  it('pauses an unconfirmed P5 terminal filter but allows an unfiltered read without lookup access', async () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 'p5', accessRevision: 1 }
    const access: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_P5']) }
    const { api } = configuredLiveReadApi()
    const runtime = createReadRuntime(api, () => ({ scope, access }))
    const blocked = runtime.p5ListOptions(
      { merchantId: '2', terminalId: 'terminal-a', search: '', page: 0, size: 10 },
      { lookupParentId: '1', lookupState: 'ready', optionIds: ['terminal-a'] },
    )
    expect(blocked.enabled).toBe(false)
    await expect(blocked.queryFn({ signal: new AbortController().signal })).rejects.toBeInstanceOf(ReadConfigurationError)
    expect(runtime.p5ListOptions({ search: '', page: 0, size: 10 }).enabled).toBe(true)
    expect(vi.mocked(api.p5List)).not.toHaveBeenCalled()
  })
})
