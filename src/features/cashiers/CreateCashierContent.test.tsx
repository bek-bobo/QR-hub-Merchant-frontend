import { Children, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createActionRegistry } from '@/shared/api/one-dispatch-action'
import { deferred } from '@/test/auth-fakes'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { useQueryClient } from '@tanstack/react-query'
import { CreateCashierContent } from './CreateCashierContent'

// This direct-call suite mocks React hooks; keep it on the option/value contract.
// The real Radix form is exercised by CreateForms.lifecycle.test.tsx.
vi.mock('@/components/ui/select', async () => ({
  Select: (await import('@/test/select-contract')).SelectContract,
}))

const harness = vi.hoisted(() => ({
  index: 0,
  fields: ['Cashier A', '901234567', 'terminal-1', null] as Array<string | null>,
  registry: null as ReturnType<typeof createActionRegistry> | null,
  request: vi.fn(), invalidate: vi.fn(),
}))
const scope = { source: 'live' as const, sessionScopeId: 'session-a', accessRevision: 1 }
const options = [{ id: 'terminal-1', name: 'Terminal A' }]

// Keep this direct-call suite focused on form contracts. The live composition
// hook executes through real React mounting in the lifecycle suite.
vi.mock('./live-create-cashier', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./live-create-cashier')>()
  return { ...actual, useLiveCashierCreateAdapter: () => {
    const current = { runtime: useReadRuntime(), auth: useProtectedReadContext(),
      queryClient: useQueryClient(), transport: { request: harness.request } }
    return actual.createLiveCashierCreateAdapter(() => current, scope)
  } }
})

// Exercise form callbacks with the real controller, without a browser or network.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual,
    useState: (initial: unknown) => {
      const index = harness.index++
      return [index < 4 ? harness.fields[index] : typeof initial === 'function' ? initial() : initial, vi.fn()]
    },
    useContext: () => null,
    useMemo: (factory: () => unknown) => factory(),
    useEffect: () => undefined,
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  }
})
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: options, isPending: false, isError: false }),
  useQueryClient: () => ({ getQueryState: () => ({ status: 'success', isInvalidated: false, data: options }),
    getQueryCache: () => ({ findAll: () => [] }), invalidateQueries: harness.invalidate }),
}))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: () => ({
  scope, getCurrentScope: () => scope, actionRegistry: harness.registry,
  capabilities: { terminalLookup: true },
  queries: { terminalLookupOptions: () => ({ enabled: true }) },
}) }))
vi.mock('@/shared/api/http', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/api/http')>(),
  createHttpTransport: () => ({ request: harness.request }),
}))
vi.mock('@/shared/api/ProtectedReadContext', () => ({ useProtectedReadContext: () => ({
  getSessionSnapshot: () => ({ phase: 'authenticated', profile: { permissions: ['CREATE_CASHIER', 'GET_CASHIERS', 'GET_DROPDOWN_TERMINALS'] } }),
  protectedMutation: async (operation: (context: { accessToken: string; signal: AbortSignal }) => Promise<unknown>) => {
    try { return { status: 'success', data: await operation({ accessToken: 'synthetic', signal: new AbortController().signal }) } }
    catch { return { status: 'failed' } }
  },
}) }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_WEB_API_BASE_URL', 'https://web.example.test')
  harness.registry = createActionRegistry()
  harness.index = 0
  harness.fields = ['Cashier A', '901234567', 'terminal-1', null]
  harness.invalidate.mockResolvedValue(undefined)
  harness.request.mockResolvedValue({ ok: true, status: 200, body: { success: true, data: null } })
})

afterEach(() => { vi.unstubAllEnvs(); harness.registry?.invalidateAll() })

function form(onConfirmed = vi.fn()) {
  harness.index = 0
  let tree = CreateCashierContent({ onConfirmed, onPendingChange: vi.fn() })
  // Follow the adapter composition to exercise the same shared form callbacks.
  while (typeof tree.type === 'function') tree = tree.type(tree.props)
  const node = Children.toArray(tree.props.children).find((child) => isValidElement(child) && child.type === 'form')
  if (!isValidElement<{ onSubmit: (event: { preventDefault: () => void }) => Promise<void> }>(node)) throw new Error('Expected create form')
  return { tree, submit: () => node.props.onSubmit({ preventDefault: vi.fn() }), onConfirmed }
}

describe('modal create content', () => {
  it('keeps the fixed phone prefix and single terminal selection without a page Card', () => {
    const html = renderToStaticMarkup(form().tree)
    expect(html).toContain('F.I.Sh.')
    expect(html).toContain('+998')
    expect(html).toContain('Terminalni tanlang')
    expect(html).not.toMatch(/<select[^>]*\smultiple(?:\s|=|>)/)
    expect(html).not.toContain('data-slot="card"')
  })

  it('dispatches once, keeps the wire body, invalidates and closes only after confirmation', async () => {
    const response = deferred<{ ok: boolean; status: number; body: { success: boolean; data: null } }>()
    harness.request.mockReturnValue(response.promise)
    const view = form()
    const first = view.submit()
    const duplicate = view.submit()
    expect(view.onConfirmed).not.toHaveBeenCalled()
    response.resolve({ ok: true, status: 200, body: { success: true, data: null } })
    await Promise.all([first, duplicate])
    expect(harness.request).toHaveBeenCalledTimes(1)
    expect(harness.request.mock.calls[0]?.[0].body).toEqual({ fullname: 'Cashier A', phone: '998901234567', terminalIds: ['terminal-1'] })
    expect(harness.invalidate).toHaveBeenCalled()
    expect(view.onConfirmed).toHaveBeenCalled()
    harness.fields = ['', '', '', null]
    const reopened = form()
    expect(renderToStaticMarkup(reopened.tree)).not.toContain('value="Cashier A"')
    expect(renderToStaticMarkup(reopened.tree)).not.toContain('Holat noma’lum')
  })

  it('keeps an uncertain failure open with the existing error and no redispatch', async () => {
    harness.request.mockResolvedValue({ ok: false, status: 500 })
    const view = form()
    await view.submit()
    await view.submit()
    expect(view.onConfirmed).not.toHaveBeenCalled()
    expect(harness.request).toHaveBeenCalledTimes(1)
    expect(renderToStaticMarkup(form().tree)).toContain('Holat noma’lum')
  })
})
