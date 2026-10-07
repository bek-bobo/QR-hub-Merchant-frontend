// @vitest-environment happy-dom
import { act, StrictMode, useEffect, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { useScopedActionRegistry } from '@/app/read/useScopedActionRegistry'
import type { createActionRegistry } from '@/shared/api/one-dispatch-action'
import type { P5Row } from '@/shared/contracts/p5-read'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { P5Results } from './P5Results'
import { p5ResetIntentKey, type createP5ResetController, type P5ResetPort } from './p5-reset'
import { P5Page } from './P5Page'

const bridge = vi.hoisted(() => ({ props: null as ComponentProps<typeof P5Results> | null }))
vi.mock('./P5Results', () => ({ P5Results: (props: ComponentProps<typeof P5Results>) => {
  useEffect(() => { bridge.props = props }, [props])
  return <div>{props.data?.content.map((row, index) => <button key={`${row.deviceId}-${index}`} data-testid={row.deviceId}
    disabled={!props.resetAvailable} onClick={() => props.onReset?.(row)}>{row.deviceId}</button>)}</div>
} }))
vi.mock('./P5FilterControls', () => ({ P5AdvancedFilterFields: () => null,
  P5QuickSearch: ({ onDraftChange }: { onDraftChange: (search: string) => void }) => <div>
    {['', 'B', 'C'].map((search) => <button key={search} data-testid={`query-${search || 'A'}`}
      onClick={() => onDraftChange(search)}>Query {search || 'A'}</button>)}
  </div>,
}))
// Presentation only: the real page/view subscription and durable controller are exercised.
vi.mock('./P5ResetDialog', () => ({ P5ResetDialog: (props: ComponentProps<typeof import('./P5ResetDialog').P5ResetDialog>) => <div>
  <span data-testid="outcome">{props.state.outcome.kind}</span>
  {props.state.dialogOpen ? <>
    <button data-testid="confirm" disabled={props.state.outcome.kind === 'pending'} onClick={props.onConfirm}>Confirm</button>
    <button data-testid="dismiss" onClick={props.onCancel}>Dismiss</button>
  </> : null}
  {props.state.outcome.kind === 'unknown' ? <button data-testid="acknowledge" onClick={props.onAcknowledgeUnknown}>Acknowledge</button> : null}
</div> }))

const scope: ReadScope = { source: 'live', sessionScopeId: 'f03', accessRevision: 1 }
const row: P5Row = { deviceId: 'X', deviceStatus: 0, description: 'A', terminalName: 'Terminal', terminalId: 't',
  terminalType: 'P5', merchantName: 'Merchant', staticQrId: null, staticQrLink: null, staticQrStatus: null, createdAt: '2026-10-06T10:00:00' }
const page = (rows: readonly P5Row[]) => ({ content: rows, totalElements: rows.length, totalPages: 1, page: 0, size: 20 })
const key = (search = '') => ['live', 'f03', 1, 'p5-list', search]
type Controller = ReturnType<typeof createP5ResetController>
const mounted: { root: Root; host: HTMLElement; client: QueryClient }[] = []
beforeEach(() => vi.useFakeTimers())

afterEach(async () => {
  for (const { root, host, client } of mounted.splice(0)) {
    await act(async () => root.unmount()); host.remove(); client.clear()
  }
  vi.useRealTimers()
  notifyManager.setScheduler((callback) => { setTimeout(callback, 0) })
})

async function setup(strict = false) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  // Deliver query changes within act instead of depending on browser timer ordering under suite load.
  notifyManager.setScheduler(queueMicrotask)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, structuralSharing: false } } })
  const rows = new Map([['', row], ['B', { ...row, description: 'B' }], ['C', { ...row, deviceId: 'Y' }]])
  for (const [search, value] of rows) client.setQueryData(key(search), page([value]))
  let currentScope = scope
  let canRead = true
  let canReset = true
  let available = true
  let registry!: ReturnType<typeof createActionRegistry>
  let resolve!: (value: unknown) => void
  let reject!: (error: Error) => void
  let preflight: () => Promise<void> = async () => undefined
  const send = vi.fn<P5ResetPort['reset']>(() => new Promise((yes, no) => { resolve = yes; reject = no }))
  const port: P5ResetPort = { reset: async (request, intentScope, canDispatch) => {
    await preflight()
    if (!canDispatch?.()) throw new (await import('@/shared/api/one-dispatch-action')).ActionNotDispatchedError()
    return send(request, intentScope)
  } }
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host); mounted.push({ root, host, client })
  function Owner() {
    const actions = useScopedActionRegistry(currentScope)
    useEffect(() => { registry = actions }, [actions])
    const runtime = { scope: currentScope, getCurrentScope: () => currentScope, actionRegistry: actions,
      p5ResetPort: available ? port : null,
      capabilities: { p5List: canRead, p5ResetPin: canReset, merchantLookup: false, terminalLookup: false },
      readiness: { p5List: { kind: 'configured' }, p5Reset: { kind: 'configured' } }, queries: {
        merchantLookupOptions: () => ({ queryKey: ['merchants'], queryFn: async () => [], enabled: false }),
        terminalLookupOptions: () => ({ queryKey: ['terminals'], queryFn: async () => [], enabled: false }),
        p5ListOptions: (filters: { search: string }) => ({ queryKey: key(filters.search), enabled: true,
          queryFn: async () => page([rows.get(filters.search)!]), staleTime: Infinity, structuralSharing: false }),
      } }
    return <ReadRuntimeContext.Provider value={runtime as unknown as ReadRuntimeContextValue}><P5Page /></ReadRuntimeContext.Provider>
  }
  const render = () => <QueryClientProvider client={client}>{strict ? <StrictMode><Owner /></StrictMode> : <Owner />}</QueryClientProvider>
  await act(async () => root.render(render()))
  const click = async (id: string) => {
    const button = host.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)
    expect(button, `Expected ${id} interaction`).not.toBeNull()
    await act(async () => button!.click())
    if (id.startsWith('query-')) await act(async () => vi.advanceTimersByTimeAsync(400))
  }
  const controller = () => registry.getOrCreate<Controller>(p5ResetIntentKey(scope, 'X'), () => { throw Error('Expected retained X ledger') })
  return { host, client, rows, send, invalidate, click, controller,
    settle: async (unknown = false) => { await act(async () => unknown ? reject(Error('lost response')) : resolve({ success: true, data: null })) },
    rerender: async () => { await act(async () => root.render(render())) },
    access: (read: boolean, reset: boolean, ready = true) => { canRead = read; canReset = reset; available = ready },
    replaceScope: async (next: ReadScope) => { currentScope = next; await act(async () => root.render(render())) },
    holdPreflight: () => { let resume!: () => void; preflight = () => new Promise<void>((yes) => { resume = yes }); return () => resume() },
    refresh: async (value: P5Row) => {
      rows.set('', value)
      await act(async () => bridge.props!.onRetry())
    },
  }
}

describe('F03 current P5 query evidence lifecycle', () => {
  it.each([false, true])('accepts X from query B using the same controller (StrictMode=%s)', async (strict) => {
    const h = await setup(strict); await h.click('X'); const first = h.controller()
    await h.click('dismiss'); await h.click('query-B'); await h.click('X')
    expect(h.controller()).toBe(first)
    expect(first.getState().dialogOpen).toBe(true)
    expect(first.getState().intent?.description).toBe('B')
    await h.click('confirm'); expect(h.send).toHaveBeenCalledTimes(1); await h.settle()
  })
  it('accepts an equivalent refetched row with new identity', async () => {
    const h = await setup(); await h.click('X'); const a = h.controller(); await h.click('dismiss')
    const refreshed = { ...row }; await h.refresh(refreshed)
    expect(h.client.getQueryData<ReturnType<typeof page>>(key())!.content[0]).toBe(refreshed)
    await h.click('X'); expect(a.getState().dialogOpen).toBe(true)
    expect(h.send).not.toHaveBeenCalled()
  })
  it('accepts the current B row when starting a fresh intent after A confirmation', async () => {
    const h = await setup(); await h.click('X'); await h.click('confirm'); await h.settle()
    const a = h.controller()
    await h.click('query-B'); await h.click('X')
    expect(h.controller()).toBe(a)
    expect(a.getState().dialogOpen).toBe(true)
    expect(a.getState().intent?.description).toBe('B')
    expect(h.send).toHaveBeenCalledTimes(1)
  })
  it('blocks X absent from current query even when A remains cached', async () => {
    const h = await setup(); await h.click('X'); const a = h.controller(); await h.click('dismiss')
    await h.click('query-C')
    expect(a.request(row)).toBe(false)
    expect(h.send).not.toHaveBeenCalled()
  })
  it('blocks current ineligible X', async () => {
    const h = await setup(); await h.click('X'); const a = h.controller(); await h.click('dismiss')
    await act(async () => h.client.setQueryData(key('B'), page([{ ...row, deviceStatus: 1 }])))
    await h.click('query-B')
    expect(a.request(row)).toBe(false)
    expect(h.send).not.toHaveBeenCalled()
  })
  it.each([false, true])('retains pending and original identity across query switch (StrictMode=%s)', async (strict) => {
    const h = await setup(strict); await h.click('X'); await h.click('confirm'); const a = h.controller()
    const intent = a.getState().intent
    await h.click('query-B'); await h.click('X')
    expect(h.controller()).toBe(a)
    expect(a.getState().intent).toBe(intent)
    expect(a.getState().outcome.kind).toBe('pending')
    expect(h.host.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.disabled).toBe(true)
    expect((await a.confirm()).kind).toBe('not-sent')
    expect(h.send).toHaveBeenCalledTimes(1)
    await h.settle(); expect(a.getState().outcome.kind).toBe('confirmed')
    expect(h.invalidate).toHaveBeenCalledTimes(1)
  })
  it('preserves unknown across query switch and requires explicit acknowledgement', async () => {
    const h = await setup(); await h.click('X'); await h.click('confirm'); await h.settle(true)
    const a = h.controller(); await h.click('query-B'); await h.click('X')
    expect(a.getState().outcome.kind).toBe('unknown')
    expect(a.beginNewIntent(false)).toBe(false)
    expect((await a.confirm()).kind).toBe('not-sent')
    expect(h.send).toHaveBeenCalledTimes(1)
    await h.click('acknowledge')
    expect(a.getState().outcome.kind).toBe('idle')
    expect(a.getState().intent?.description).toBe('B')
    await h.click('confirm'); expect(h.send).toHaveBeenCalledTimes(2); await h.settle()
  })
  it.each(['B', 'C'])('settles and invalidates after switching to %s without reopening', async (search) => {
    const h = await setup(); await h.click('X'); await h.click('confirm'); const a = h.controller()
    await h.click(`query-${search}`); await h.settle()
    expect(a.getState().outcome.kind).toBe('confirmed')
    expect(h.invalidate).toHaveBeenCalledTimes(1)
    expect(h.client.getQueryState(key())!.isInvalidated).toBe(true)
  })
  it.each([false, true])('uses B after A eviction, preserving pending=%s', async (pending) => {
    const h = await setup(); await h.click('X'); const a = h.controller()
    if (pending) await h.click('confirm'); else await h.click('dismiss')
    await h.click('query-B'); h.client.removeQueries({ queryKey: key(), exact: true })
    await h.click('X'); expect(h.controller()).toBe(a)
    expect(a.getState().dialogOpen).toBe(true)
    if (pending) { expect(h.send).toHaveBeenCalledTimes(1); await h.settle() }
    else { await h.click('confirm'); expect(h.send).toHaveBeenCalledTimes(1); await h.settle() }
  })
  it.each(['read', 'reset', 'port'])('blocks current %s loss', async (kind) => {
    const h = await setup(); await h.click('X'); const a = h.controller(); await h.click('dismiss')
    h.access(kind !== 'read', kind !== 'reset', kind !== 'port'); await h.rerender()
    expect(a.request(row)).toBe(false)
    expect(h.send).not.toHaveBeenCalled()
  })
  it('blocks row loss during protected-session preflight', async () => {
    const h = await setup(); const resume = h.holdPreflight()
    await h.click('X'); await h.click('confirm'); await h.click('query-C')
    await act(async () => resume())
    expect(h.send).not.toHaveBeenCalled()
  })
  it.each(['invalidated', 'removed', 'duplicate'])('blocks non-authoritative current query evidence (%s)', async (kind) => {
    const h = await setup(); await h.click('X'); const a = h.controller(); await h.click('dismiss')
    await h.click('query-B')
    await act(async () => {
      if (kind === 'invalidated') await h.client.invalidateQueries({ queryKey: key('B'), refetchType: 'none' })
      else if (kind === 'removed') h.client.removeQueries({ queryKey: key('B'), exact: true })
      else h.client.setQueryData(key('B'), page([row, { ...row }]))
    })
    expect(a.request(row)).toBe(false)
    expect(h.send).not.toHaveBeenCalled()
  })
  it('rejects an obsolete row argument before dispatch even when current B has X', async () => {
    const h = await setup(); await h.click('X'); const a = h.controller(); await h.click('dismiss')
    await h.click('query-B')
    expect(a.request(row)).toBe(false)
    await h.click('X'); expect(a.getState().intent?.description).toBe('B')
    expect(h.send).not.toHaveBeenCalled()
  })
  it('retains an unknown response arriving after X disappears from the visible query', async () => {
    const h = await setup(); await h.click('X'); await h.click('confirm'); const a = h.controller()
    await h.click('query-C'); await h.settle(true)
    expect(a.getState().outcome.kind).toBe('unknown')
    expect(a.request(row)).toBe(false)
    await h.click('query-B'); await h.click('X')
    expect(a.getState().outcome.kind).toBe('unknown')
    expect(a.beginNewIntent(false)).toBe(false)
    expect(h.send).toHaveBeenCalledTimes(1)
  })
  it('suppresses late settlement after current access loss', async () => {
    const h = await setup(); await h.click('X'); await h.click('confirm'); const a = h.controller()
    h.access(true, false); await h.rerender(); await h.settle()
    expect(a.getState().outcome.kind).toBe('idle')
    expect(h.invalidate).not.toHaveBeenCalled()
  })
  it('clears registry state on owner teardown and suppresses late settlement', async () => {
    const h = await setup(); await h.click('X'); await h.click('confirm'); const a = h.controller()
    const owner = mounted.pop()!
    await act(async () => owner.root.unmount()); owner.host.remove()
    expect(a.getState().outcome.kind).toBe('idle')
    await h.settle(); expect(h.invalidate).not.toHaveBeenCalled()
    owner.client.clear()
  })
  it.each([{ ...scope, accessRevision: 2 }, { ...scope, sessionScopeId: 'new-session' }])('invalidates on scope replacement: %j', async (next) => {
    const h = await setup(); await h.click('X'); await h.click('confirm'); const a = h.controller()
    await h.replaceScope(next)
    expect(a.getState().outcome.kind).toBe('idle')
    await h.settle(); expect(h.invalidate).not.toHaveBeenCalled()
  })
})
