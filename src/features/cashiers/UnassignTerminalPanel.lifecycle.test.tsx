// @vitest-environment happy-dom
import { act, StrictMode, useEffect, type ComponentProps } from 'react'
import { createRoot, type Root } from '@/test/locale-fixture'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { useScopedActionRegistry } from '@/app/read/useScopedActionRegistry'
import { AccessContext } from '@/shared/auth/useAccessContext'
import type { createActionRegistry } from '@/shared/api/one-dispatch-action'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { CashierResults } from './CashierResults'
import type { createUnassignTerminalController } from './unassign-terminal'
import { CashierPage } from './CashierPage'

const bridge = vi.hoisted(() => ({ request: vi.fn(), permissions: ['GET_CASHIERS', 'UNASSIGN_TERMINAL'],
  prepare: async () => undefined as void, props: null as ComponentProps<typeof CashierResults> | null }))
vi.mock('@/shared/api/ProtectedReadContext', () => ({ useProtectedReadContext: () => ({
  getSessionSnapshot: () => ({ phase: 'authenticated', profile: { permissions: bridge.permissions } }),
  protectedMutation: async (dispatch: (context: unknown) => Promise<unknown>) => {
    await bridge.prepare()
    try { return { status: 'success', data: await dispatch({ accessToken: 'test', signal: new AbortController().signal }) } }
    catch { return { status: 'error' } }
  },
}) }))
vi.mock('@/shared/api/http', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/api/http')>(), createHttpTransport: () => ({ request: bridge.request }),
}))
// Keep page selection, real panel, registry, query evidence and React lifecycle intact.
// Replace table/dialog presentation with direct buttons for the same page callbacks.
vi.mock('./CashierResults', () => ({ CashierResults: (props: ComponentProps<typeof CashierResults>) => {
  useEffect(() => { bridge.props = props }, [props])
  const row = props.data?.content[0]
  return <div>
    {row ? <button data-testid="open" onClick={() => props.onSelectUnassign?.(row)}>Open unassign</button> : null}
    {props.selected ? <>
      <button data-testid="close" onClick={props.onClose}>Close dialog</button>
      {props.selected.terminals.map((terminal) => <button key={terminal.id} data-testid={terminal.id}
        onClick={() => props.onUnassign?.(terminal)}>{terminal.name}</button>)}
      {props.unassignSurface}
    </> : null}
  </div>
} }))

const scope: ReadScope = { source: 'live', sessionScopeId: 'f02', accessRevision: 1 }
const row: CashierRow = { id: '41', fullname: 'Cashier', phone: '998901234567', roleDisplay: null,
  statusCode: 0, createdAt: null, updatedAt: null,
  terminals: [{ id: 'A', name: 'Terminal A', statusCode: 0 }, { id: 'B', name: 'Terminal B', statusCode: 0 }] }
const data = { content: [row], totalElements: 1, totalPages: 1, page: 0, size: 20 }
type Controller = ReturnType<typeof createUnassignTerminalController>
const mounted: { root: Root; host: HTMLElement; client: QueryClient }[] = []
afterEach(async () => {
  for (const { root, host, client } of mounted.splice(0)) {
    await act(async () => root.unmount()); host.remove(); client.clear()
  }
  vi.unstubAllEnvs()
})

async function setup(strict = false) {
  vi.stubEnv('VITE_WEB_API_BASE_URL', 'https://api.example.test')
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  bridge.permissions = ['GET_CASHIERS', 'UNASSIGN_TERMINAL']
  bridge.prepare = async () => undefined
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  let currentScope = scope
  let registry!: ReturnType<typeof createActionRegistry>
  const key = [scope.source, scope.sessionScopeId, scope.accessRevision, 'cashier-list']
  client.setQueryData(key, data, { updatedAt: 100 })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  let resolve!: (value: unknown) => void
  let reject!: (error: Error) => void
  bridge.request.mockReset().mockImplementation(() => new Promise((yes, no) => { resolve = yes; reject = no }))
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  mounted.push({ root, host, client })
  function Owner() {
    const actions = useScopedActionRegistry(currentScope)
    useEffect(() => { registry = actions }, [actions])
    const runtime = { scope: currentScope, getCurrentScope: () => currentScope, actionRegistry: actions,
      capabilities: { cashierList: true, merchantLookup: false, terminalLookup: false },
      readiness: { cashierList: { kind: 'configured' } }, queries: {
        merchantLookupOptions: () => ({ queryKey: ['merchants'], enabled: false, queryFn: async () => [] }),
        terminalLookupOptions: () => ({ queryKey: ['terminals'], enabled: false, queryFn: async () => [] }),
        cashierListOptions: () => ({ queryKey: key, enabled: true, queryFn: async () => data, staleTime: Infinity }),
      } }
    return <ReadRuntimeContext.Provider value={runtime as unknown as ReadRuntimeContextValue}>
      <AccessContext.Provider value={{ kind: 'authenticated', permissions: new Set(bridge.permissions) }}>
        <CashierPage />
      </AccessContext.Provider>
    </ReadRuntimeContext.Provider>
  }
  const render = () => <QueryClientProvider client={client}>{strict ? <StrictMode><Owner /></StrictMode> : <Owner />}</QueryClientProvider>
  await act(async () => root.render(render()))
  const click = async (id: string) => { await act(async () => host.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!.click()) }
  const select = async (id = 'A') => { if (!host.querySelector('[data-testid="close"]')) await click('open'); await click(id) }
  const cancel = async () => { await act(async () => Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'Bekor qilish')!.click()) }
  const confirmButton = () => Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'Terminalni ajratish')
  const confirm = async () => { expect(confirmButton()).toBeDefined(); await act(async () => confirmButton()!.click()) }
  const controller = (id = 'A') => registry.getOrCreate<Controller>(
    `cashier.unassign:live:f02:1:${JSON.stringify(key)}:100:41:${id}`, () => { throw new Error('Expected retained controller') })
  return { host, client, key, invalidate, select, cancel, confirm, confirmButton, controller,
    close: () => click('close'), rerender: async () => { await act(async () => root.render(render())) },
    settle: async (unknown = false) => { await act(async () => unknown ? reject(new Error('connection lost')) : resolve({ ok: true, status: 200, body: { success: true, data: null } })) },
    replaceScope: async (next: ReadScope) => { currentScope = next; await act(async () => root.render(render())) },
  }
}

describe('F02 real cashier selection lifetime', () => {
  it.each([false, true])('cancels and reselects A with a current retained controller (StrictMode=%s)', async (strict) => {
    const h = await setup(strict)
    await h.select(); const first = h.controller()
    await h.cancel(); await h.select()
    expect(h.controller()).toBe(first)
    expect(first.isCurrentSelection()).toBe(true)
    expect(h.host.textContent).not.toContain('Oldingi tanlov')
    await h.confirm()
    expect(bridge.request).toHaveBeenCalledTimes(1)
    await h.settle()
    expect(first.getState().outcome.kind).toBe('confirmed')
    expect(h.invalidate).toHaveBeenCalledTimes(1)
  })
  it('closes and reopens A before dispatch', async () => {
    const h = await setup(); await h.select(); const first = h.controller()
    await h.close(); await h.select()
    expect(h.controller()).toBe(first)
    expect(first.armConfirmation()).toBe(true)
    expect(bridge.request).not.toHaveBeenCalled()
  })
  it('switches A to B and never authorizes A through B selection', async () => {
    const h = await setup(); await h.select(); const a = h.controller()
    expect(a.armConfirmation()).toBe(true)
    await h.cancel(); await h.select('B')
    expect(a.isCurrentSelection()).toBe(false)
    expect((await a.submit()).kind).toBe('not-sent')
    expect(bridge.request).not.toHaveBeenCalled()
    await h.confirm()
    expect(bridge.request.mock.calls[0]![0].query).toEqual({ cashierId: '41', terminalId: 'B' })
    await h.settle()
  })
  it.each([false, true])('retains pending through reopen and original settlement (StrictMode=%s)', async (strict) => {
    const h = await setup(strict); await h.select(); await h.confirm(); const a = h.controller()
    await h.close(); await h.select()
    expect(h.controller()).toBe(a)
    expect(a.getState().outcome.kind).toBe('pending')
    expect(h.host.textContent).toContain('Ajratish so‘rovi yuborilmoqda.')
    expect(h.confirmButton()!.disabled).toBe(true)
    expect(a.armConfirmation()).toBe(false)
    expect((await a.submit()).kind).toBe('not-sent')
    expect(bridge.request).toHaveBeenCalledTimes(1)
    await h.settle()
    expect(a.getState().outcome.kind).toBe('confirmed')
    expect(h.invalidate).toHaveBeenCalledTimes(1)
  })
  it('retains unknown through close/reopen without replay', async () => {
    const h = await setup(); await h.select(); await h.confirm(); await h.settle(true)
    const a = h.controller(); await h.close(); await h.select()
    expect(a.getState().outcome.kind).toBe('unknown')
    expect(h.host.textContent).toContain('Natija noma’lum.')
    expect(h.confirmButton()!.disabled).toBe(true)
    expect((await a.submit()).kind).toBe('not-sent')
    expect(bridge.request).toHaveBeenCalledTimes(1)
    expect(h.invalidate).not.toHaveBeenCalled()
  })
  it.each([false, true])('retains original settlement while closed (unknown=%s)', async (unknown) => {
    const h = await setup(); await h.select(); await h.confirm(); const a = h.controller()
    await h.close(); await h.settle(unknown)
    expect(a.getState().outcome.kind).toBe(unknown ? 'unknown' : 'confirmed')
    expect(bridge.request).toHaveBeenCalledTimes(1)
    expect(h.invalidate).toHaveBeenCalledTimes(unknown ? 0 : 1)
    if (unknown) {
      await h.select()
      expect(h.confirmButton()!.disabled).toBe(true)
      expect((await a.submit()).kind).toBe('not-sent')
    }
  })
  it('does not rewrite pending A into the newly selected B', async () => {
    const h = await setup(); await h.select(); await h.confirm(); const a = h.controller()
    await h.close(); await h.select('B')
    expect(h.controller('B')).not.toBe(a)
    expect(h.controller('B').getState().outcome.kind).toBe('idle')
    expect(a.armConfirmation()).toBe(false)
    expect((await a.submit()).kind).toBe('not-sent')
    await h.settle()
    expect(a.getState().outcome.kind).toBe('confirmed')
    expect(bridge.request).toHaveBeenCalledTimes(1)
    expect(bridge.request.mock.calls[0]![0].query).toEqual({ cashierId: '41', terminalId: 'A' })
  })
  it('clears the registry on owner teardown and suppresses the late response', async () => {
    const h = await setup(); await h.select(); await h.confirm(); const a = h.controller()
    const owner = mounted.pop()!
    await act(async () => owner.root.unmount()); owner.host.remove()
    expect(a.getState().outcome.kind).toBe('idle')
    await h.settle()
    expect(h.invalidate).not.toHaveBeenCalled()
    owner.client.clear()
  })
  it('does not authorize a cancelled A confirmation after reselecting A', async () => {
    const h = await setup(); await h.select(); const a = h.controller()
    expect(a.armConfirmation()).toBe(true)
    await h.cancel(); await h.select()
    expect((await a.submit()).kind).toBe('not-sent')
    expect(bridge.request).not.toHaveBeenCalled()
  })
  it('checks cancellation and reselection again after asynchronous auth preparation', async () => {
    const h = await setup(); await h.select()
    let resume!: () => void
    bridge.prepare = () => new Promise<void>((yes) => { resume = yes })
    await h.confirm(); await h.close(); await h.select()
    await act(async () => resume())
    expect(bridge.request).not.toHaveBeenCalled()
  })
  it('blocks current permission loss', async () => {
    const h = await setup(); await h.select(); const a = h.controller()
    a.armConfirmation(); bridge.permissions = ['GET_CASHIERS']; await h.rerender()
    expect((await a.submit()).kind).toBe('not-sent')
    expect(bridge.request).not.toHaveBeenCalled()
  })
  it.each(['invalidated', 'replaced'])('blocks stale row evidence (%s)', async (kind) => {
    const h = await setup(); await h.select(); const a = h.controller(); a.armConfirmation()
    if (kind === 'invalidated') await act(async () => h.client.invalidateQueries({ queryKey: h.key, refetchType: 'none' }))
    else await act(async () => h.client.setQueryData(h.key, { ...data, content: [{ ...row, fullname: 'Changed' }] }, { updatedAt: 101 }))
    expect((await a.submit()).kind).toBe('not-sent')
    expect(bridge.request).not.toHaveBeenCalled()
  })
  it.each([{ ...scope, accessRevision: 2 }, { ...scope, sessionScopeId: 'new-session' }])('clears durable state on scope replacement: %j', async (next) => {
    const h = await setup(); await h.select(); await h.confirm(); const a = h.controller()
    await h.replaceScope(next)
    expect(a.getState().outcome.kind).toBe('idle')
    await h.settle()
    expect(h.invalidate).not.toHaveBeenCalled()
  })
})
