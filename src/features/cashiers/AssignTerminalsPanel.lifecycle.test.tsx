// @vitest-environment happy-dom
import { act, StrictMode, useEffect, useState } from 'react'
import { createRoot, type Root } from '@/test/locale-fixture'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScopedActionRegistry } from '@/app/read/useScopedActionRegistry'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import type { createActionRegistry } from '@/shared/api/one-dispatch-action'
import { readKeys } from '@/shared/api/read-keys'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { createAssignTerminalsController } from './assign-terminals'
import { AssignTerminalsPanel } from './AssignTerminalsPanel'

const bridge = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/shared/api/ProtectedReadContext', () => ({ useProtectedReadContext: () => ({
  getSessionSnapshot: () => ({ phase: 'authenticated', profile: { permissions: ['GET_CASHIERS', 'ASSIGN_TERMINALS', 'GET_DROPDOWN_TERMINALS'] } }),
  protectedMutation: async (dispatch: (context: unknown) => Promise<unknown>) => {
    try { return { status: 'success', data: await dispatch({ accessToken: 'test', signal: new AbortController().signal }) } }
    catch { return { status: 'error' } }
  },
}) }))
vi.mock('@/shared/api/http', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/api/http')>(),
  createHttpTransport: () => ({ request: bridge.request }),
}))

const scope: ReadScope = { source: 'live', sessionScopeId: 'lifecycle', accessRevision: 1 }
const target: CashierRow = { id: '41', fullname: 'Cashier', phone: '998901234567', roleDisplay: null,
  statusCode: 0, createdAt: null, updatedAt: null, terminals: [] }
const options = [{ id: 'new', name: 'New terminal' }, { id: 'next', name: 'Next terminal' }]
type Controller = ReturnType<typeof createAssignTerminalsController>
const mounted: { root: Root; host: HTMLElement; client: QueryClient }[] = []

afterEach(async () => {
  for (const { root, host, client } of mounted.splice(0)) {
    await act(async () => root.unmount())
    host.remove()
    client.clear()
  }
  vi.unstubAllEnvs()
})

async function setup(strict = false) {
  vi.stubEnv('VITE_WEB_API_BASE_URL', 'https://api.example.test')
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const resultKey = [scope.source, scope.sessionScopeId, scope.accessRevision, 'cashier-list']
  let data = { content: [target], totalElements: 1, totalPages: 1, page: 0, size: 10 }
  let updatedAt = 100
  client.setQueryData(resultKey, data, { updatedAt })
  client.setQueryData(readKeys.terminals(scope), options)
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const confirmed = vi.fn()
  let resolve!: (value: unknown) => void
  let reject!: (error: Error) => void
  bridge.request.mockReset().mockImplementation(() => new Promise((yes, no) => { resolve = yes; reject = no }))
  let registry!: ReturnType<typeof createActionRegistry>
  let currentScope = scope
  let toggle!: (open: boolean) => void
  function Owner() {
    const scopedRegistry = useScopedActionRegistry(currentScope)
    const [open, setOpen] = useState(false)
    useEffect(() => { registry = scopedRegistry; toggle = setOpen }, [scopedRegistry])
    const runtime = { actionRegistry: scopedRegistry, getCurrentScope: () => currentScope,
      capabilities: { terminalLookup: true }, queries: { terminalLookupOptions: () => ({
        queryKey: readKeys.terminals(scope), queryFn: async () => options, enabled: true, staleTime: Infinity,
      }) } }
    return <ReadRuntimeContext.Provider value={runtime as unknown as ReadRuntimeContextValue}>
      {open ? <AssignTerminalsPanel target={data.content[0]!} resultData={data} resultKey={resultKey}
        dataUpdatedAt={updatedAt} scope={scope} onRefresh={() => undefined} onConfirmed={confirmed} /> : null}
    </ReadRuntimeContext.Provider>
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  mounted.push({ root, host, client })
  const render = () => <QueryClientProvider client={client}>{strict ? <StrictMode><Owner /></StrictMode> : <Owner />}</QueryClientProvider>
  await act(async () => root.render(render()))
  const open = async () => { await act(async () => toggle(true)) }
  const close = async () => { await act(async () => toggle(false)); expect(host.querySelector('form')).toBeNull() }
  const select = async () => { await act(async () => host.querySelector<HTMLInputElement>('input')!.click()) }
  const submit = async () => { await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
  const controller = () => registry.getOrCreate<Controller>(
    `cashier.assign:live:lifecycle:1:${JSON.stringify(resultKey)}:${updatedAt}:41`,
    () => { throw new Error('Controller must already exist') },
  )
  const succeed = async () => { await act(async () => resolve({ ok: true, status: 200, body: { success: true, data: null } })) }
  await open()
  return { host, client, invalidate, confirmed, open, close, select, submit, controller, succeed,
    unknown: async () => { await act(async () => reject(new Error('connection lost after POST'))) },
    replaceScope: async (next: ReadScope) => { currentScope = next; await act(async () => root.render(render())) },
    newResult: () => {
      updatedAt++
      data = { ...data, content: [{ ...target, terminals: [{ id: 'new', name: 'New terminal', statusCode: 0 }] }] }
      data = client.setQueryData<typeof data>(resultKey, data, { updatedAt })!
    },
  }
}

describe('F01 assignment UI lifetime', () => {
  it('preserves normal success and exact request body', async () => {
    const h = await setup()
    await h.select(); await h.submit()
    const controller = h.controller()
    await h.succeed()
    expect(bridge.request).toHaveBeenCalledTimes(1)
    expect(bridge.request.mock.calls[0]![0].body).toEqual({ cashierId: 41, terminalIds: ['new'] })
    expect(controller.getState().outcome.kind).toBe('confirmed')
    expect(h.confirmed).toHaveBeenCalledTimes(1)
    expect(h.client.getQueryState(['live', 'lifecycle', 1, 'cashier-list'])?.isInvalidated).toBe(true)
  })

  it.each([false, true])('retains pending across close/reopen and settles the original POST (StrictMode=%s)', async (strict) => {
    const h = await setup(strict)
    await h.select(); await h.submit()
    const controller = h.controller()
    expect(bridge.request).toHaveBeenCalledTimes(1)
    await h.close(); await h.open(); await h.select()
    // Attempt even a synthetic form submit: controller protection must back up the disabled button.
    await h.submit()
    expect(bridge.request).toHaveBeenCalledTimes(1)
    expect(h.controller()).toBe(controller)
    expect(controller.getState().outcome.kind).toBe('pending')
    expect(h.host.textContent).toContain('Biriktirish yuborilmoqda.')
    expect(h.host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true)
    await h.succeed()
    expect(controller.getState().outcome.kind).toBe('confirmed')
    expect(h.invalidate).toHaveBeenCalledTimes(1)
    expect(h.confirmed).toHaveBeenCalledTimes(1)
  })

  it('still confirms and invalidates when the original response arrives while closed', async () => {
    const h = await setup()
    await h.select(); await h.submit()
    const controller = h.controller()
    await h.close(); await h.succeed()
    expect(controller.getState().outcome.kind).toBe('confirmed')
    expect(h.invalidate).toHaveBeenCalledTimes(1)
    expect(h.confirmed).toHaveBeenCalledTimes(1)
    await h.open()
    expect(h.controller()).toBe(controller)
    // The confirmed result invalidates this captured row; a fresh read is required.
    expect(h.host.querySelector('form')).toBeNull()
  })

  it('retains unknown after close/reopen without replay or invalidation', async () => {
    const h = await setup()
    await h.select(); await h.submit(); await h.unknown()
    await h.close(); await h.open(); await h.select(); await h.submit()
    expect(h.controller().getState().outcome.kind).toBe('unknown')
    expect(h.host.textContent).toContain('Natija noma’lum.')
    expect(h.host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true)
    expect(bridge.request).toHaveBeenCalledTimes(1)
    expect(h.invalidate).not.toHaveBeenCalled()
  })

  it('permits fresh selection after closing without dispatch', async () => {
    const h = await setup()
    await h.select(); await h.close(); await h.open()
    expect(h.host.querySelector<HTMLInputElement>('input')!.checked).toBe(false)
    await h.select(); await h.submit(); await h.succeed()
    expect(bridge.request).toHaveBeenCalledTimes(1)
  })

  it.each([
    { ...scope, accessRevision: 2 },
    { ...scope, sessionScopeId: 'replacement-session' },
  ])('invalidates durable state on genuine scope replacement: %j', async (next) => {
    const h = await setup()
    await h.select(); await h.submit()
    const controller = h.controller()
    await h.replaceScope(next)
    expect(controller.getState().outcome.kind).toBe('idle')
    await h.succeed()
    expect(h.invalidate).not.toHaveBeenCalled()
    expect(h.confirmed).not.toHaveBeenCalled()
  })

  it('invalidates on registry owner teardown and suppresses the late response', async () => {
    const h = await setup()
    await h.select(); await h.submit()
    const controller = h.controller()
    const mountedOwner = mounted.pop()!
    await act(async () => mountedOwner.root.unmount())
    mountedOwner.host.remove()
    expect(controller.getState().outcome.kind).toBe('idle')
    await h.succeed()
    expect(h.invalidate).not.toHaveBeenCalled()
    mountedOwner.client.clear()
  })

  it('permits a new assignment after an authoritative result refresh creates a new context', async () => {
    const h = await setup()
    await h.select(); await h.submit(); await h.succeed(); await h.close()
    const first = h.controller()
    h.newResult()
    await h.open()
    expect(h.controller()).not.toBe(first)
    await h.select(); await h.submit(); await h.succeed()
    expect(bridge.request).toHaveBeenCalledTimes(2)
    expect(bridge.request.mock.calls[1]![0].body).toEqual({ cashierId: 41, terminalIds: ['next'] })
    expect(h.confirmed).toHaveBeenCalledTimes(2)
  })
})
