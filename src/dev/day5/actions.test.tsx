import { useContext, type ReactNode } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { decideLiveFeatureRoute } from '@/app/live-route-policy'
import { createActionRegistry } from '@/shared/api/one-dispatch-action'
import { CashierCreateAdapterContext } from '@/features/cashiers/cashier-create-adapter'
import { createCashierCreateController } from '@/features/cashiers/create-cashier'
import { Day5CashierPreview } from './actions'
import { createDay5ReadRuntime, createDay5Simulator, type Day5Simulator } from './simulator'
import rootSource from './Day5PreviewRoot.tsx?raw'

const harness = vi.hoisted(() => ({
  open: false,
  simulator: null as Day5Simulator | null,
  client: null as QueryClient | null,
  registry: null as ReturnType<typeof createActionRegistry> | null,
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === false ? harness.open : initial) }
})
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual,
    useQueryClient: () => harness.client,
    useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => ({
      data: harness.client?.getQueryData(queryKey), isPending: false, isError: false, dataUpdatedAt: 1, refetch: vi.fn(),
    }),
  }
})
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: () => {
  const simulator = harness.simulator!
  return { scope: simulator.getCurrentScope(), getCurrentScope: simulator.getCurrentScope,
    actionRegistry: harness.registry, capabilities: { terminalLookup: simulator.has('terminal.lookup') },
    queries: createDay5ReadRuntime(simulator),
  }
} }))
vi.mock('@/features/cashiers/CashierResults', () => ({
  CashierResults: ({ headerActions }: { headerActions: ReactNode }) => <div>{headerActions}</div>,
}))
vi.mock('@/shared/api/ProtectedReadContext', () => ({ useProtectedReadContext: () => {
  throw new Error('DEV create must use its simulator adapter, without live auth or transport')
} }))
// Keep the real dialog/content composition while omitting the portal for SSR.
vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  const part = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  function Root({ children }: { children?: ReactNode }) {
    const adapter = useContext(CashierCreateAdapterContext)
    const port = adapter?.port()
    return <div data-create-port={port && port === harness.simulator?.ports.create ? 'simulator' : 'unavailable'}>{children}</div>
  }
  return { ...actual, Dialog: { ...actual.Dialog,
    Root, Portal: part, Overlay: part, Content: part, Title: part, Description: part, Close: part,
  } }
})

beforeEach(() => {
  harness.open = false
  harness.simulator = createDay5Simulator('NORMAL')
  harness.client = new QueryClient()
  harness.registry = createActionRegistry()
  const runtime = createDay5ReadRuntime(harness.simulator)
  harness.client.setQueryData(runtime.terminalLookupOptions().queryKey, harness.simulator.terminalOptions())
})

function currentCreateController() {
  const scope = harness.simulator!.getCurrentScope()
  // Inspect the actual controller mounted by shared content, without render-time mutation.
  return harness.registry!.getOrCreate<ReturnType<typeof createCashierCreateController>>(
    `cashier.create:${scope.source}:${scope.sessionScopeId}:${scope.accessRevision}`,
    () => { throw new Error('Missing shared create controller') },
  )
}

describe('Day5 cashier modal alignment', () => {
  it('keeps creation out of preview navigation and feature routes', () => {
    expect(rootSource).not.toContain('cashierCreate')
    expect(rootSource).not.toContain('cashiers/new')
    expect(rootSource).toContain('feature="cashiers"')
    const simulator = createDay5Simulator('CREATE_ONLY')
    expect(decideLiveFeatureRoute('cashiers', { sessionPhase: 'authenticated',
      access: simulator.currentState().access, registrations: simulator.api.registrations })).toBe('forbidden')
  })

  it('shows the action only with the existing cashier create permission', () => {
    expect(renderToStaticMarkup(<Day5CashierPreview simulator={harness.simulator!} />)).toContain('Yangi kassir')
    harness.simulator!.revokePermission('CREATE_CASHIER')
    harness.open = true
    const html = renderToStaticMarkup(<Day5CashierPreview simulator={harness.simulator!} />)
    expect(html).not.toContain('Yangi kassir')
    expect(html).not.toContain('data-create-port')
  })

  it('opens the shared single-terminal form with a simulator port and preserves one dispatch', async () => {
    harness.open = true
    const html = renderToStaticMarkup(<Day5CashierPreview simulator={harness.simulator!} />)
    expect(html).toContain('Yangi kassir')
    expect(html).toContain('+998')
    expect(html).toContain('Terminalni tanlang')
    expect(html).not.toContain('type="checkbox"')
    expect(html).toContain('data-create-port="simulator"')
    const controller = currentCreateController()
    const draft = { fullname: 'D5 Modal Cashier', phone: '998901000099', terminalIds: [harness.simulator!.terminalOptions()[0].id] }
    const results = await Promise.all([controller.submit(draft), controller.submit(draft)])
    expect(results[0].kind).toBe('confirmed')
    expect(results[1]).toEqual({ kind: 'not-sent', reason: 'Bu intent allaqachon yuborilgan. Yangi amalni alohida tanlang.' })
    expect(harness.simulator!.getSnapshot().counters.create).toBe(1)
    const page = await harness.simulator!.api.cashierList({ search: '', page: 0, size: 10 }, new AbortController().signal)
    expect(page.content[0]).toMatchObject({ fullname: draft.fullname, phone: draft.phone })
    expect(page.content.filter((row) => row.phone === draft.phone)).toHaveLength(1)
    expect((await controller.submit(draft)).kind).toBe('not-sent')
    expect(harness.simulator!.getSnapshot().counters.create).toBe(1)
    harness.simulator!.revokePermission('CREATE_CASHIER')
    controller.beginNewIntent()
    expect((await controller.submit(draft)).kind).toBe('not-sent')
    expect(harness.simulator!.getSnapshot().counters.create).toBe(1)
  })

  it('retains the unavailable action contract without dispatching a simulator create', async () => {
    harness.simulator = createDay5Simulator('ACTION_CONTRACT_BLOCKED')
    const runtime = createDay5ReadRuntime(harness.simulator)
    harness.client!.setQueryData(runtime.terminalLookupOptions().queryKey, harness.simulator.terminalOptions())
    harness.open = true
    const html = renderToStaticMarkup(<Day5CashierPreview simulator={harness.simulator} />)
    expect(html).toContain('data-create-port="unavailable"')
    const result = await currentCreateController().submit({ fullname: 'D5 Blocked',
      phone: '998901000099', terminalIds: [harness.simulator.terminalOptions()[0].id] })
    expect(result.kind).toBe('not-sent')
    expect(harness.simulator.getSnapshot().counters.create).toBe(0)
  })
})
