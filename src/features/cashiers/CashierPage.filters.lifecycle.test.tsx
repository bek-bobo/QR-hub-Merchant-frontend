// @vitest-environment happy-dom
import { chooseSelectOption } from '@/test/select-interaction'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from '@/test/locale-fixture'
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { AccessContext } from '@/shared/auth/useAccessContext'
import { dependentReadGate, type CashierListFilters, type DependentLookupGateInput } from '@/shared/contracts/management-filters'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { CashierResults } from './CashierResults'
import { CashierPage } from './CashierPage'

// Only the table presentation is replaced; page state, filter controls, Radix
// drawer, reconciliation effects and QueryClient subscriptions execute normally.
vi.mock('./CashierResults', () => ({ CashierResults: (props: ComponentProps<typeof CashierResults>) => <div>
  {props.headerActions}{props.quickFilters}
  <output data-blocked>{String(props.blocked)}</output>
  {props.data?.content[0] && !props.blocked ? <button onClick={() => props.onSelect(props.data!.content[0]!)}>Select cashier</button> : null}
  {props.selected ? <output data-selected>{props.selected.id}</output> : null}
</div> }))

const row: CashierRow = { id: '41', fullname: 'Cashier', phone: '998901234567',
  roleDisplay: null, statusCode: 0, createdAt: null, updatedAt: null, terminals: [] }
const page = { content: [row], totalElements: 1, totalPages: 1, page: 0, size: 20 }
const mounted: { root: Root; host: HTMLElement; client: QueryClient }[] = []
afterEach(async () => {
  for (const { root, host, client } of mounted.splice(0)) {
    await act(async () => root.unmount()); host.remove(); client.clear()
  }
  notifyManager.setScheduler((callback) => { setTimeout(callback, 0) })
  localStorage.clear()
})

async function setup() {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  notifyManager.setScheduler(queueMicrotask)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['merchants'], [{ id: '1', name: 'Merchant A' }, { id: '2', name: 'Merchant B' }])
  client.setQueryData(['terminals', '1'], [{ id: 'A', name: 'Terminal A' }])
  let resolveTerminals!: (value: { id: string; name: string }[]) => void
  const pendingTerminals = new Promise<{ id: string; name: string }[]>((resolve) => { resolveTerminals = resolve })
  const dispatch = vi.fn(async (_filters: CashierListFilters) => page)
  const scope = { source: 'live', sessionScopeId: 'f07', accessRevision: 1 } as const
  const runtime = { scope, getCurrentScope: () => scope,
    capabilities: { cashierList: true, merchantLookup: true, terminalLookup: true },
    readiness: { cashierList: { kind: 'configured' } }, queries: {
      merchantLookupOptions: () => ({ queryKey: ['merchants'], enabled: true, queryFn: async () => [] }),
      terminalLookupOptions: (merchantId?: string) => ({ queryKey: ['terminals', merchantId ?? ''],
        enabled: true, queryFn: () => pendingTerminals }),
      cashierListOptions: (filters: CashierListFilters, gate: DependentLookupGateInput) => ({
        queryKey: ['cashiers', filters],
        enabled: dependentReadGate({ appliedParentId: filters.merchantId, appliedChildId: filters.terminalId, ...gate }) === 'ready',
        queryFn: () => dispatch({ ...filters }),
      }),
    } }
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host); mounted.push({ root, host, client })
  await act(async () => root.render(<QueryClientProvider client={client}>
    <ReadRuntimeContext.Provider value={runtime as unknown as ReadRuntimeContextValue}>
      <AccessContext.Provider value={{ kind: 'authenticated', permissions: new Set(['GET_CASHIERS']) }}>
        <CashierPage />
      </AccessContext.Provider>
    </ReadRuntimeContext.Provider>
  </QueryClientProvider>))
  const button = (text: string) => {
    const result = Array.from(document.querySelectorAll('button')).find((item) => item.textContent === text)
    expect(result, `Expected ${text} button`).toBeDefined()
    return result!
  }
  const click = async (text: string) => { await act(async () => button(text).click()) }
  const select = async (index: number, value: string) => {
    const input = document.querySelectorAll<HTMLButtonElement>('[role="combobox"]')[index]!
    await chooseSelectOption(input, value)
  }
  return { host, client, dispatch, button, click, select,
    terminalsReady: async () => { await act(async () => resolveTerminals([{ id: 'B', name: 'Terminal B' }])) },
  }
}

describe('F07 real cashier draft / Apply lifecycle', () => {
  it('opens a named drawer, moves focus into it and restores trigger focus after Escape', async () => {
    const h = await setup()
    const trigger = h.button('Filtrlar'); trigger.focus()
    await h.click('Filtrlar')
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(h.host.contains(dialog)).toBe(false)
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Filtrlar')
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(dialog.querySelector('[aria-label="Filtrlarni yopish"]')).not.toBeNull()
    await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    // Radix restores focus on the next task after removing its FocusScope.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(h.dispatch).toHaveBeenCalledTimes(1)
  })

  it('edits search without dispatch, then commits on submit and drops selection from the old query', async () => {
    const h = await setup(); await h.click('Select cashier')
    expect(h.host.querySelector('[data-selected]')).not.toBeNull()
    const input = h.host.querySelector<HTMLInputElement>('input[enterkeyhint="search"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '  New cashier  ')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(input.value).toBe('  New cashier  ')
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.host.querySelector('[data-selected]')).not.toBeNull()
    await act(async () => h.host.querySelector('form[role="search"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(h.dispatch).toHaveBeenCalledTimes(2)
    expect(h.dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'New cashier', page: 0 }))
    expect(h.host.querySelector('[data-selected]')).toBeNull()
  })

  it('clears a dependent terminal on parent change, keeps loading selection disabled, and commits only on Apply', async () => {
    const h = await setup(); await h.click('Filtrlar')
    await h.select(0, '1'); await h.select(1, 'A')
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    await h.select(0, '2')
    const terminal = document.querySelectorAll<HTMLButtonElement>('[role="combobox"]')[1]!
    expect(terminal.textContent).toContain('Yuklanmoqda...')
    expect(terminal.disabled).toBe(true)
    expect(terminal.textContent).not.toContain('Terminal A')
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    await h.terminalsReady()
    expect(terminal.disabled).toBe(false)
    expect(terminal.textContent).toContain('Barcha terminallar')
    await h.select(1, 'B')
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    await h.click('Qo‘llash')
    expect(h.dispatch).toHaveBeenCalledTimes(2)
    expect(h.dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ merchantId: '2', terminalId: 'B' }))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('fails closed when applied terminal evidence errors and refuses an unverified Apply', async () => {
    const h = await setup(); await h.click('Filtrlar'); await h.select(0, '1'); await h.select(1, 'A')
    await h.click('Qo‘llash'); await h.click('Select cashier')
    expect(h.dispatch).toHaveBeenCalledTimes(2)
    await act(async () => clientLookupError(h.client))
    expect(h.host.querySelector('[data-blocked]')?.textContent).toBe('true')
    expect(h.host.querySelector('[data-selected]')).toBeNull()
    await h.click('Filtrlar')
    expect(document.querySelectorAll<HTMLButtonElement>('[role="combobox"]')[1]!.disabled).toBe(true)
    await h.click('Qo‘llash')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('tasdiqlanmadi')
    expect(h.dispatch).toHaveBeenCalledTimes(2)
  })
})

function clientLookupError(client: QueryClient) {
  // Deliver a genuine query error through its live observers, preserving stale data.
  client.getQueryCache().find({ queryKey: ['terminals', '1'], exact: true })!.setState({
    status: 'error', error: new Error('Terminal lookup failed'), fetchStatus: 'idle',
  })
}
