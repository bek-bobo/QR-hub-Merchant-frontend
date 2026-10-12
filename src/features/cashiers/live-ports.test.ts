import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LiveWebContext } from '@/app/read/useLiveWebContext'
import { createProtectedReadBridge } from '@/shared/api/protected-read'
import { createHttpTransport, validateWebBaseUrl } from '@/shared/api/http'
import { readKeys } from '@/shared/api/read-keys'
import { SessionController } from '@/shared/auth/session-controller'
import { deferred, makeAuthApi, syntheticPairA, syntheticPairB, syntheticProfileA } from '@/test/auth-fakes'
import { createLiveCashierCreateAdapter } from './live-create-cashier'
import { createLiveAssignTerminalsAdapter } from './live-assign-terminals'
import { createLiveUnassignTerminalAdapter } from './live-unassign-terminal'
import { createCashierCreateController } from './create-cashier'
import { createAssignTerminalsController } from './assign-terminals'
import { createUnassignTerminalController } from './unassign-terminal'
import { createLiveCreateQrAdapter } from '@/features/dynamic-qr/live-create-adapter'
import { createCreateQrController } from '@/features/dynamic-qr/create-qr'
import { decodeCreateTerminalOptionsResponse } from '@/shared/contracts/terminal-lookup.contract'
import { decodeCurrencyOptionsResponse } from '@/shared/contracts/currency.contract'
import type { ActionResult } from '@/shared/api/one-dispatch-action'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { endpoints } from '@/shared/contracts/endpoints'

const flows = ['cashier create', 'assign', 'unassign', 'QR create'] as const
type Flow = typeof flows[number]
const permissions = ['CREATE_CASHIER', 'GET_CASHIERS', 'GET_DROPDOWN_TERMINALS', 'ASSIGN_TERMINALS',
  'UNASSIGN_TERMINAL', 'CREATE_DYNAMIC_QR', 'GET_CURRENCY_CODE', 'GET_DYNAMIC_QRS']
const clients: QueryClient[] = []
afterEach(() => { clients.splice(0).forEach((client) => client.clear()) })

async function setup(flow: Flow) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }); clients.push(client)
  const refreshAuth = vi.fn(async () => syntheticPairB)
  const session = new SessionController({ api: makeAuthApi({ getMe: async () => ({ ...syntheticProfileA, permissions }), refresh: refreshAuth }),
    cache: { cancel: vi.fn(), clear: vi.fn() }, now: () => 0, generateScopeId: () => 'f08' })
  await session.establishSession(syntheticPairA, { release: vi.fn() })
  const scope = { source: 'live', sessionScopeId: 'f08', accessRevision: 1 } as const
  let currentScope: ReadScope = { ...scope }
  let currentPermissions: readonly string[] = permissions
  let status = 200
  let payload: unknown = flow === 'QR create' ? { success: true, data: { pkey: 'pkey', link: 'opaque link' } } : { success: true, data: null }
  let failure: 'network' | 'timeout' | null = null
  let afterSend = () => undefined as void
  let preflight: () => Promise<void> = async () => undefined
  const fetchImpl = vi.fn<typeof fetch>(async () => {
    afterSend()
    if (failure) throw failure === 'timeout' ? new DOMException('timeout', 'TimeoutError') : new TypeError('network failure')
    return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
  })
  const base = validateWebBaseUrl('https://web.example.test', 'production')
  if (base.kind !== 'valid') throw new Error('Invalid test base')
  const transport = createHttpTransport({ service: 'web', baseUrl: base.value, fetchImpl })
  const mutationResults: string[] = []
  const auth: LiveWebContext['auth'] = {
    bridge: createProtectedReadBridge(session),
    getSessionSnapshot: () => {
      const snapshot = session.getSnapshot()
      return snapshot.phase === 'authenticated' ? { ...snapshot, profile: { ...snapshot.profile, permissions: currentPermissions } } : snapshot
    },
    protectedMutation: async (operation) => {
      await preflight()
      const result = await session.protectedMutation(operation)
      mutationResults.push(result.status)
      return result
    },
  }
  const capabilities: LiveWebContext['runtime']['capabilities'] = {
    dashboard: false, dynamicQr: true, terminalLookup: true, terminalList: false, bankAccountList: false,
    cashierList: true, merchantLookup: false, bankAccountLookup: false, p5List: false, p5ResetPin: false,
  }
  let context: LiveWebContext = { runtime: { scope, getCurrentScope: () => currentScope, capabilities }, auth, queryClient: client, transport }
  const terminal = { id: 'active', name: 'Active terminal', statusCode: 0 }
  const cashier = { id: '41', fullname: 'Cashier', phone: '998901234567', roleDisplay: null, statusCode: 0,
    createdAt: null, updatedAt: null, terminals: [terminal] }
  const data = { content: [cashier], totalElements: 1, totalPages: 1, page: 0, size: 20 }
  const resultKey = ['live', 'f08', 1, 'cashier-list']
  client.setQueryData(resultKey, data, { updatedAt: 100 })
  client.setQueryData(readKeys.terminals(scope), [{ id: 'new', name: 'New terminal' }])
  const qrTerminals = decodeCreateTerminalOptionsResponse({ success: true, data: [{ id: '0123456789abcdef0123456789abcdef',
    name: 'QR terminal', minAmount: 100000, maxAmount: 2000000000 }] })
  const currencies = decodeCurrencyOptionsResponse([{ code: 'UZS', nameUz: 'So‘m', status: 0 }])
  client.setQueryData([...readKeys.terminals(scope), 'create-limits'], qrTerminals)
  client.setQueryData(readKeys.currencies(scope), currencies)
  const target = { cashier, terminal }
  let selected: typeof target | null = target
  const evidence = { target: cashier, resultData: data, resultKey, dataUpdatedAt: 100, scope, onConfirmed: vi.fn() }
  let selectedGetter = () => selected
  const create = createLiveCashierCreateAdapter(() => context, scope)
  const assign = createLiveAssignTerminalsAdapter(() => context, () => evidence)
  const unassign = createLiveUnassignTerminalAdapter(() => context, () => ({ ...evidence, target, getSelectedTarget: selectedGetter }))
  const qr = createLiveCreateQrAdapter(() => context, scope)
  const invalidate = flow === 'cashier create' ? create.invalidateConfirmed : flow === 'assign' ? assign.invalidateConfirmed
    : flow === 'unassign' ? unassign.invalidateConfirmed : qr.controllerDependencies.invalidateConfirmed!
  const refresh = vi.fn(invalidate)
  let run: () => Promise<ActionResult<unknown>>
  let outcome: () => string
  if (flow === 'cashier create') {
    const controller = createCashierCreateController({ ...create, invalidateConfirmed: refresh })
    run = () => controller.submit({ fullname: ' Cashier ', phone: '998901234567', terminalIds: ['new'] })
    outcome = () => controller.getState().outcome.kind
  } else if (flow === 'assign') {
    const controller = createAssignTerminalsController({ ...assign, invalidateConfirmed: refresh })
    run = () => controller.submit(['new']); outcome = () => controller.getState().outcome.kind
  } else if (flow === 'unassign') {
    const controller = createUnassignTerminalController({ ...unassign, invalidateConfirmed: refresh })
    run = () => { controller.armConfirmation(); return controller.submit() }; outcome = () => controller.getState().outcome.kind
  } else {
    const controller = createCreateQrController({ ...qr.controllerDependencies, invalidateConfirmed: refresh })
    run = () => controller.submit({ draft: { terminalId: qrTerminals[0]!.id, amountInput: '1 000', currencyCode: 'UZS' },
      terminals: qrTerminals, currencies, terminalLookupAllowed: true, currencyLookupAllowed: true })
    outcome = () => controller.getState().outcome.kind
  }
  return { client, scope, run, outcome, fetchImpl, refresh, refreshAuth, session, mutationResults, qr, target,
    setResponse: (nextStatus: number, body: unknown = payload) => { status = nextStatus; payload = body },
    fail: (kind: typeof failure) => { failure = kind },
    revoke: () => { currentPermissions = [] },
    replaceScope: () => { currentScope = { ...scope, accessRevision: 2 } },
    replaceSelectionGetter: () => { selectedGetter = () => null },
    dropSelection: () => { selected = null },
    replaceContext: () => {
      const nextRequest = vi.fn(transport.request)
      context = { ...context, auth: { ...auth, protectedMutation: (operation) => session.protectedMutation(operation) },
        transport: { request: nextRequest } }
      return nextRequest
    },
    removeTransport: () => { context = { ...context, transport: null } },
    afterSend: (callback: () => void) => { afterSend = callback },
    invalidateEvidence: () => {
      const key = flow === 'QR create' ? readKeys.currencies(scope) : flow === 'unassign' ? resultKey : readKeys.terminals(scope)
      client.getQueryCache().find({ queryKey: key, exact: true })!.invalidate()
    },
    replaceCache: () => {
      const empty = new QueryClient(); clients.push(empty)
      context = { ...context, queryClient: empty }
    },
    denyPreflight: () => { context = { ...context, auth: { ...auth, protectedMutation: async () => ({ status: 'anonymous' }) } } },
    holdPreflight: () => { const hold = deferred<void>(); preflight = () => hold.promise; return hold.resolve },
  }
}

describe.each(flows)('F08 %s live wire parity', (flow) => {
  it('uses the exact method, endpoint, auth and request, and never replays confirmation', async () => {
    const h = await setup(flow)
    expect((await h.run()).kind).toBe('confirmed')
    expect((await h.run()).kind).toBe('not-sent')
    expect(h.fetchImpl).toHaveBeenCalledTimes(1)
    const [url, options] = h.fetchImpl.mock.calls[0]!
    const expected = flow === 'cashier create' ? { method: 'POST', path: '/cashiers/create', body: { fullname: 'Cashier', phone: '998901234567', terminalIds: ['new'] } }
      : flow === 'assign' ? { method: 'POST', path: '/cashiers/assign/terminals', body: { cashierId: 41, terminalIds: ['new'] } }
        : flow === 'unassign' ? { method: 'DELETE', path: '/cashiers/unassign/terminal', body: undefined }
          : { method: 'POST', path: '/dynamic-qrs/create', body: { terminalId: '0123456789abcdef0123456789abcdef', amount: 100000, currencyCode: 'UZS' } }
    const actual = new URL(String(url))
    expect(actual.pathname).toBe(expected.path)
    expect(options?.method).toBe(expected.method)
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer test-access-a')
    expect(options?.body ? JSON.parse(String(options.body)) : undefined).toEqual(expected.body)
    expect(Object.fromEntries(actual.searchParams)).toEqual(flow === 'unassign' ? { cashierId: '41', terminalId: 'active' } : {})
    expect(await h.refresh.mock.results[0]!.value).toBe('skipped')
  })

  it.each([401, 403])('preserves session policy for HTTP %s without auth retry or mutation replay', async (status) => {
    const h = await setup(flow); h.setResponse(status)
    const result = await h.run()
    expect(result.kind).toBe(status === 401 ? 'stale' : 'unknown')
    expect(h.session.getSnapshot().phase).toBe(status === 401 ? 'anonymous' : 'authenticated')
    expect(h.mutationResults).toEqual([status === 401 ? 'session-ended' : 'access-denied'])
    expect(h.refreshAuth).not.toHaveBeenCalled()
    expect(h.fetchImpl).toHaveBeenCalledTimes(1)
    expect(h.refresh).not.toHaveBeenCalled()
  })

  it.each(['network', 'timeout'] as const)('retains unknown after %s ambiguity and prevents replay', async (failure) => {
    const h = await setup(flow); h.fail(failure)
    expect((await h.run()).kind).toBe('unknown')
    expect((await h.run()).kind).toBe('not-sent')
    expect(h.fetchImpl).toHaveBeenCalledTimes(1)
    expect(h.refresh).not.toHaveBeenCalled()
  })

  it.each([{ success: true }, { success: false, data: null }, { success: true, data: { unsupported: true } }])('fails closed for envelope %j', async (payload) => {
    const h = await setup(flow); h.setResponse(200, payload)
    expect((await h.run()).kind).toBe('unknown')
    expect(h.fetchImpl).toHaveBeenCalledTimes(1)
    expect(h.refresh).not.toHaveBeenCalled()
  })

  it('keeps confirmation when an active refresh fails', async () => {
    const h = await setup(flow)
    const key = ['live', 'f08', 1, flow === 'QR create' ? 'dynamic-qrs' : 'cashier-list']
    const observer = new QueryObserver(h.client, { queryKey: key, initialData: { content: [h.target.cashier] },
      queryFn: async () => { throw Error('Refresh failed') }, retry: false, staleTime: Infinity })
    const stop = observer.subscribe(() => undefined)
    try {
      expect((await h.run()).kind).toBe('confirmed')
      await expect(h.refresh.mock.results[0]!.value).rejects.toThrow()
      expect(h.outcome()).toBe('confirmed')
      expect(h.client.getQueryState(key)?.status).toBe('error')
      expect(h.fetchImpl).toHaveBeenCalledTimes(1)
    } finally { stop() }
  })

  it.each(['permission', 'scope', 'transport'] as const)('checks current %s after asynchronous auth preflight', async (change) => {
    const h = await setup(flow); const resume = h.holdPreflight()
    const result = h.run()
    await Promise.resolve(); await Promise.resolve()
    if (change === 'permission') h.revoke()
    if (change === 'scope') h.replaceScope()
    if (change === 'transport') h.removeTransport()
    resume()
    expect(['not-sent', 'stale']).toContain((await result).kind)
    expect(h.fetchImpl).not.toHaveBeenCalled()
  })

  it('uses replacement auth/transport dependencies with the same retained controller', async () => {
    const h = await setup(flow)
    const request = h.replaceContext()
    expect((await h.run()).kind).toBe('confirmed')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it.each(['read', 'cache'] as const)('rechecks current %s evidence after auth preflight', async (change) => {
    const h = await setup(flow); const resume = h.holdPreflight()
    const result = h.run(); await Promise.resolve(); await Promise.resolve()
    if (change === 'read') h.invalidateEvidence()
    else h.replaceCache()
    resume()
    expect((await result).kind).toBe('not-sent')
    expect(h.fetchImpl).not.toHaveBeenCalled()
  })

  it('classifies auth failure before dispatch as not-sent', async () => {
    const h = await setup(flow); h.denyPreflight()
    expect((await h.run()).kind).toBe('not-sent')
    expect(h.fetchImpl).not.toHaveBeenCalled()
    expect(h.refresh).not.toHaveBeenCalled()
  })
})

describe('F08 unassign current selection owner', () => {
  it('uses a replacement selection getter during auth preflight', async () => {
    const h = await setup('unassign'); const resume = h.holdPreflight()
    const result = h.run(); await Promise.resolve(); await Promise.resolve()
    h.replaceSelectionGetter(); resume()
    expect((await result).kind).toBe('not-sent')
    expect(h.fetchImpl).not.toHaveBeenCalled()
  })
})

describe.each(['terminals', 'currencies'] as const)('F08 extracted QR %s lookup', (lookup) => {
  const response = lookup === 'terminals' ? { success: true, data: [{ id: '0123456789abcdef0123456789abcdef',
    name: 'QR terminal', minAmount: 100000, maxAmount: 2000000000 }] } : [{ code: 'UZS', nameUz: 'So‘m', status: 0 }]
  const options = (h: Awaited<ReturnType<typeof setup>>) => lookup === 'terminals' ? h.qr.terminalOptions() : h.qr.currencyOptions(true)

  it('preserves key, GET endpoint, bearer auth, decoding and query policy', async () => {
    const h = await setup('QR create'); h.setResponse(200, response)
    const query = options(h)
    const data = await query.queryFn({ signal: new AbortController().signal })
    expect(data).toHaveLength(1)
    expect(query.queryKey).toEqual(lookup === 'terminals' ? [...readKeys.terminals(h.scope), 'create-limits'] : readKeys.currencies(h.scope))
    expect(query).toMatchObject({ enabled: true, retry: false, staleTime: 30000, refetchOnWindowFocus: false, refetchOnReconnect: false })
    const [url, request] = h.fetchImpl.mock.calls[0]!
    expect(new URL(String(url)).pathname).toBe(lookup === 'terminals' ? endpoints.terminalLookup.path : endpoints.currencies.path)
    expect(new URL(String(url)).search).toBe('')
    expect(request?.method).toBe('GET')
    expect(request?.body).toBeUndefined()
    expect(new Headers(request?.headers).get('Authorization')).toBe('Bearer test-access-a')
  })

  it('does not dispatch a lookup after permission revocation', async () => {
    const h = await setup('QR create'); h.revoke()
    await expect(options(h).queryFn({ signal: new AbortController().signal })).rejects.toThrow()
    expect(h.fetchImpl).not.toHaveBeenCalled()
  })

  it.each(['permission', 'scope'] as const)('rejects a completed lookup after current %s changes', async (change) => {
    const h = await setup('QR create'); h.setResponse(200, response)
    h.afterSend(change === 'permission' ? h.revoke : h.replaceScope)
    await expect(options(h).queryFn({ signal: new AbortController().signal })).rejects.toThrow()
    expect(h.fetchImpl).toHaveBeenCalledTimes(1)
  })
})
