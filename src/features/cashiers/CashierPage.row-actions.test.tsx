import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { CashierResults } from './CashierResults'
import { AssignTerminalsPanel } from './AssignTerminalsPanel'
import { UnassignTerminalPanel } from './UnassignTerminalPanel'
import { CashierPage } from './CashierPage'

const state = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0,
  permissions: new Set<string>(),
  props: undefined as ComponentProps<typeof CashierResults> | undefined,
}))

// Replay local state between server renders to exercise page callbacks without
// introducing a DOM test dependency. Query and mutation components stay mocked.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, useState: ((initial: unknown) => {
    const index = state.cursor++
    if (!Object.hasOwn(state.slots, index)) state.slots[index] = typeof initial === 'function' ? initial() : initial
    const setValue = (next: unknown) => {
      state.slots[index] = typeof next === 'function' ? next(state.slots[index]) : next
    }
    return [state.slots[index], setValue] as [unknown, typeof setValue]
  }) as typeof actual.useState }
})

const row: CashierRow = { id: '11', fullname: 'Cashier A', phone: '+998901234567',
  roleDisplay: 'User', statusCode: 0, createdAt: null, updatedAt: null,
  terminals: [{ id: 'terminal-Exact', name: 'Terminal A', statusCode: 0 }] }
const scope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 } as const
const page = { content: [row], totalElements: 1, totalPages: 1, page: 0, size: 20 }

vi.mock('@/shared/auth/useAccessContext', () => ({
  useAccessContext: () => ({ kind: 'authenticated', permissions: state.permissions }),
}))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: () => ({
  scope, getCurrentScope: () => scope,
  capabilities: { cashierList: true, merchantLookup: false, terminalLookup: false },
  readiness: { cashierList: { kind: 'configured' } },
  queries: {
    merchantLookupOptions: () => ({ queryKey: ['merchants'], enabled: false }),
    terminalLookupOptions: () => ({ queryKey: ['terminals'], enabled: false }),
    cashierListOptions: () => ({ queryKey: ['cashiers'], enabled: true }),
  },
}) }))
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: { queryKey: string[] }) => ({
  data: options.queryKey[0] === 'cashiers' ? page : undefined,
  dataUpdatedAt: 123, isPending: false, isError: false, isFetching: false, refetch: vi.fn(),
}) }))
vi.mock('./CashierResults', () => ({ CashierResults: (props: ComponentProps<typeof CashierResults>) => {
  state.props = props
  return <div>results</div>
} }))
vi.mock('./AssignTerminalsPanel', () => ({ AssignTerminalsPanel: () => null }))
vi.mock('./UnassignTerminalPanel', () => ({ UnassignTerminalPanel: () => null }))

function renderPage() {
  state.cursor = 0
  renderToString(<CashierPage />)
  return state.props!
}

function findPanel(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue
    if (child.type === type) return child
    const found = findPanel(child.props.children as ReactNode, type)
    if (found) return found
  }
}

beforeEach(() => {
  state.slots = []
  state.cursor = 0
  state.props = undefined
  state.permissions = new Set(['GET_CASHIERS', 'ASSIGN_TERMINALS', 'UNASSIGN_TERMINAL'])
})

describe('cashier page direct row flows', () => {
  it('opens read-only memberships for the selected row', () => {
    renderPage().onSelect(row)
    const props = renderPage()
    expect(props.selected).toBe(row)
    expect(props.terminalMode).toBe('view')
    expect(props.assignSurface).toBeNull()
    expect(props.unassignSurface).toBeNull()
    expect(props.onUnassign).toBeUndefined()
    props.onClose()
    expect(renderPage().selected).toBeNull()
  })

  it('opens the existing assignment panel immediately for the selected row', () => {
    renderPage().onAssign?.(row)
    const props = renderPage()
    expect(props.selected).toBe(row)
    expect(props.terminalMode).toBe('assign')
    const panel = findPanel(props.assignSurface, AssignTerminalsPanel)!
    expect(panel.props.target).toBe(row)
    expect(panel.props.resultData).toBe(page)
    expect(panel.props.resultKey).toEqual(['cashiers'])
    expect(props.unassignSurface).toBeNull()
  })

  it('opens current memberships for unassign and reuses the existing confirmation panel after selection', () => {
    renderPage().onSelectUnassign?.(row)
    let props = renderPage()
    expect(props.selected).toBe(row)
    expect(props.terminalMode).toBe('unassign')
    expect(props.assignSurface).toBeNull()
    props.onUnassign?.(row.terminals[0]!)
    props = renderPage()
    const panel = findPanel(props.unassignSurface, UnassignTerminalPanel)!
    expect(panel.props.target).toEqual({ cashier: row, terminal: row.terminals[0] })
    expect(panel.props.resultData).toBe(page)
    expect(panel.props.resultKey).toEqual(['cashiers'])
  })

  it('enforces existing independent grants and removes an open mutation flow when permission is revoked', () => {
    state.permissions = new Set(['GET_CASHIERS'])
    expect(renderPage().onAssign).toBeUndefined()
    expect(renderPage().onSelectUnassign).toBeUndefined()
    state.permissions.add('ASSIGN_TERMINALS')
    let props = renderPage()
    expect(props.onAssign).toBeDefined()
    expect(props.onSelectUnassign).toBeUndefined()
    props.onAssign?.(row)
    expect(renderPage().selected).toBe(row)
    state.permissions.delete('ASSIGN_TERMINALS')
    props = renderPage()
    expect(props.selected).toBeNull()
    expect(props.assignSurface).toBeNull()
  })
})
