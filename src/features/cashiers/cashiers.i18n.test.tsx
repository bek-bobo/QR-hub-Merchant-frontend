// @vitest-environment happy-dom
import { act, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountManagement } from '@/test/management-i18n-fixture'
import { chooseSelectOption } from '@/test/select-interaction'
import { createMessages } from '@/shared/i18n/messages'
import { engineForProvider } from '@/shared/i18n/runtime'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'
import { createActionRegistry } from '@/shared/api/one-dispatch-action'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { decodeCashierPage } from '@/shared/contracts/management-read'
import { createCashierPresentation } from './presentation'
import { CashierResults } from './CashierResults'
import { CashierTerminalsContent } from './CashierTerminalsDialog'
import { CASHIER_DEFAULT_COLUMN_ORDER } from './columns'
import { CreateCashierContent } from './CreateCashierContent'
import { CashierCreateAdapterContext } from './cashier-create-adapter'
import { AssignTerminalsPanel } from './AssignTerminalsPanel'
import { UnassignTerminalPanel } from './UnassignTerminalPanel'
import { describeCashierFeedback } from './feedback'

const mocks = vi.hoisted(() => ({ assign: null as unknown, unassign: null as unknown }))
vi.mock('./live-assign-terminals', () => ({ useLiveAssignTerminalsAdapter: () => mocks.assign }))
vi.mock('./live-unassign-terminal', () => ({ useLiveUnassignTerminalAdapter: () => mocks.unassign }))
const scope = { source: 'live', sessionScopeId: 'i18n5-cashier', accessRevision: 1 } as const
const data = decodeCashierPage({ success: true, data: { content: [{ id: 41, fullname: 'cashiers.actions.assign', phone: '998901234567', role: '{{role}}', status: 1, terminals: [{ terminalId: 'active-raw', terminalName: 'Backend terminal', status: 0 }, { terminalId: 'inactive-raw', terminalName: 'Backend inactive', status: 1 }] }], totalElements: 1, totalPages: 1, page: 0, size: 20 } })
const cashier = data.content[0]!, target = { cashier, terminal: cashier.terminals[0]! }, options = [{ id: 'new-raw', name: 'Backend new terminal' }]
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes }); return { promise, resolve } }
function context(children: ReactNode) {
  const lookup = vi.fn(async () => options)
  const value = { scope, getCurrentScope: () => scope, actionRegistry: createActionRegistry(), capabilities: { terminalLookup: true }, queries: { terminalLookupOptions: () => ({ queryKey: ['cashier-options'], enabled: true, staleTime: Infinity, queryFn: lookup }) } } as unknown as ReadRuntimeContextValue
  return { element: <ReadRuntimeContext value={value}>{children}</ReadRuntimeContext>, lookup }
}
const panelProps = { resultData: data, resultKey: ['cashier-list'], dataUpdatedAt: 1, scope, onRefresh: vi.fn(), onConfirmed: vi.fn() }
beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })
describe.each(['uz', 'ru', 'en'] as const)('Cashiers %s', locale => {
  it('localizes table and membership while distinguishing general and assignment statuses', async () => {
    const view = await mountManagement(locale, <><CashierResults blocked={false} pending={false} error={false} data={data} selected={null} columnOrder={CASHIER_DEFAULT_COLUMN_ORDER} visibleColumnIds={CASHIER_DEFAULT_COLUMN_ORDER} onRetry={vi.fn()} onPageChange={vi.fn()} onSelect={vi.fn()} onClose={vi.fn()} /><CashierTerminalsContent cashier={cashier} /></>)
    try {
      const p = createCashierPresentation(locale, createMessages(view.runtime, 'cashiers'), createMessages(view.runtime, 'common'))
      expect(view.host.textContent).toContain(p.message('fields.fullname')); expect(view.host.textContent).toContain('{{role}}')
      expect(view.host.textContent).toContain('cashiers.actions.assign'); expect(view.host.textContent).toContain('active-raw')
      expect(p.status(1).label).toBe(p.message('status.unknown'))
      expect(p.assignmentStatus(1).label).toBe(p.message('status.inactive')); expect(p.assignmentStatus(777).label).toBe(p.message('status.unknown'))
    } finally { await view.dispose() }
  })
})
it('keeps a create draft, focus and exact DTO then one pending dispatch across language changes', async () => {
  const pending = deferred<unknown>(), create = vi.fn(() => pending.promise), port = { create }, confirmed = vi.fn()
  const adapter = { currentScope: () => scope, canCreate: () => true, canReadList: () => true, currentTerminalOptions: () => options, port: () => port, invalidateConfirmed: vi.fn(async () => {}) }
  const fixture = context(<CashierCreateAdapterContext value={adapter}><CreateCashierContent onConfirmed={confirmed} onPendingChange={vi.fn()} /></CashierCreateAdapterContext>)
  const view = await mountManagement('uz', fixture.element)
  try {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    const inputs = view.host.querySelectorAll<HTMLInputElement>('input'), fullname = inputs[0]!, phone = inputs[1]!, setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => { setter.call(fullname, '  Raw Name  '); fullname.dispatchEvent(new Event('input', { bubbles: true })); setter.call(phone, '901234567'); phone.dispatchEvent(new Event('input', { bubbles: true })) })
    await chooseSelectOption(view.host.querySelector<HTMLButtonElement>('[role=combobox]')!, 'new-raw')
    await act(async () => { fullname.focus(); fullname.setSelectionRange(3, 3) }); await view.switchTo('ru')
    expect(fullname.value).toBe('  Raw Name  '); expect(fullname.selectionStart).toBe(3); expect(document.activeElement).toBe(fullname); expect(create).not.toHaveBeenCalled()
    await act(async () => view.host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(create).toHaveBeenCalledExactlyOnceWith({ fullname: 'Raw Name', phone: '998901234567', terminalIds: ['new-raw'] }, scope)
    await view.switchTo('en'); expect(view.host.textContent).toContain('Closing the page'); expect(create).toHaveBeenCalledOnce(); expect(fixture.lookup).toHaveBeenCalledOnce()
    await act(async () => pending.resolve({ success: false, data: null, error: { text: 'backend.private' } }))
    expect(view.host.textContent).toContain('Outcome unknown'); expect(view.host.textContent).not.toContain('backend.private'); expect(confirmed).not.toHaveBeenCalled()
  } finally { await view.dispose() }
})
it('keeps assignment selection and one exact dispatch through pending and unknown locale changes', async () => {
  const pending = deferred<unknown>(), assign = vi.fn(() => pending.promise), port = { assign }
  mocks.assign = { currentScope: () => scope, currentTarget: () => cashier, currentOptions: () => options, canAssign: () => true, port: () => port, invalidateConfirmed: vi.fn(async () => {}) }
  const fixture = context(<AssignTerminalsPanel target={cashier} {...panelProps} />), view = await mountManagement('uz', fixture.element)
  try {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    const checkbox = view.host.querySelector<HTMLInputElement>('input[type=checkbox]')!; await act(async () => { checkbox.click(); checkbox.focus() }); await view.switchTo('ru')
    expect(checkbox.checked).toBe(true); expect(document.activeElement).toBe(checkbox); expect(assign).not.toHaveBeenCalled()
    await act(async () => view.host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(assign).toHaveBeenCalledExactlyOnceWith({ cashierId: 41, terminalIds: ['new-raw'] }, scope)
    await view.switchTo('en'); expect(assign).toHaveBeenCalledOnce(); expect(checkbox.checked).toBe(true)
    await act(async () => pending.resolve({ success: false })); expect(view.host.textContent).toContain('Some terminals may have been assigned'); expect(view.host.querySelector('button[type=submit]')!.getAttribute('disabled')).not.toBeNull()
  } finally { await view.dispose() }
})
function unassignFixture(unassign: ReturnType<typeof vi.fn>) {
  const port = { unassign }; mocks.unassign = { currentScope: () => scope, currentTarget: () => target, currentEvidence: () => target, canUnassign: () => true, port: () => port, invalidateConfirmed: vi.fn(async () => {}) }
  return context(<UnassignTerminalPanel target={target} {...panelProps} getSelectedTarget={() => target} onCancel={vi.fn()} />).element
}
it('keeps unassignment confirmation, one query, pending state and unknown warning across locales', async () => {
  const pending = deferred<unknown>(), unassign = vi.fn(() => pending.promise), view = await mountManagement('uz', unassignFixture(unassign))
  try {
    const confirm = view.host.querySelector<HTMLButtonElement>('button')!; await act(async () => confirm.focus()); await view.switchTo('ru')
    expect(document.activeElement).toBe(confirm); expect(unassign).not.toHaveBeenCalled()
    await act(async () => confirm.click()); expect(unassign).toHaveBeenCalledExactlyOnceWith({ cashierId: '41', terminalId: 'active-raw' }, scope)
    await view.switchTo('en'); expect(confirm.disabled).toBe(true); expect(unassign).toHaveBeenCalledOnce()
    await act(async () => pending.resolve({ success: false })); expect(view.host.textContent).toContain('may already be unassigned'); expect(confirm.disabled).toBe(true)
    await view.switchTo('uz'); expect(unassign).toHaveBeenCalledOnce()
  } finally { await view.dispose() }
})
it.each(['unassign.title', 'unassign.warning', 'unassign.confirm'])('withholds unsafe dispatch when essential %s is unavailable in requested and canonical resources', async key => {
  const unassign = vi.fn(), view = await mountManagement('ru', unassignFixture(unassign), runtime => {
    const engine = engineForProvider(runtime)!; engine.addResource('ru', 'cashiers', key, ''); engine.addResource('uz', 'cashiers', key, '')
  })
  try { expect(view.host.textContent).toContain(emergencyCopy.section); expect(view.host.querySelectorAll('button')).toHaveLength(1); expect(unassign).not.toHaveBeenCalled() } finally { await view.dispose() }
})
it('uses canonical/emergency fallback and keeps already-sent feedback distinct from unsafe backend text', async () => {
  const view = await mountManagement('ru', <div />)
  try {
    const engine = engineForProvider(view.runtime)!, p = createCashierPresentation('ru', createMessages(view.runtime, 'cashiers'), createMessages(view.runtime, 'common'))
    engine.addResource('ru', 'cashiers', 'actions.new', ''); expect(p.message('actions.new')).toBe('Yangi kassir')
    engine.addResource('uz', 'cashiers', 'actions.new', ''); expect(p.message('actions.new')).toBe(emergencyCopy.message)
    const unsafe = p.message as (key: string, parameters?: unknown) => string
    expect(unsafe('unassign.warning', { cashier: 'A' })).toBe(emergencyCopy.message); expect(unsafe('backend.tag')).toBe(emergencyCopy.message)
    expect(describeCashierFeedback('Bu intent allaqachon yuborilgan. Yangi amalni alohida tanlang.')).toBe('alreadySent'); expect(describeCashierFeedback('backend.private')).toBe('notSent')
  } finally { await view.dispose() }
})
