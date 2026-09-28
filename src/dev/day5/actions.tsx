import { useRef, useState, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { CashierResults } from '@/features/cashiers/CashierResults'
import { applyCashierDraft, cashierParentState, createDefaultCashierFilters } from '@/features/cashiers/page-state'
import { createCashierCreateController, invalidateCurrentCashierLists } from '@/features/cashiers/create-cashier'
import { createAssignTerminalsController, resolveCurrentAssignTarget } from '@/features/cashiers/assign-terminals'
import { createUnassignTerminalController, resolveCurrentUnassignTarget, type UnassignTarget } from '@/features/cashiers/unassign-terminal'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, TerminalOption } from '@/shared/contracts/merchant-read'
import { changeManagementPage, changeMerchantDraft, clearManagementFilters, type CashierListFilters, type LookupState } from '@/shared/contracts/management-filters'
import type { Day5Simulator } from './simulator'

// D5-MGMT-DEMO-ONLY. These controls use the same normalized controllers as live actions.
function outcomeCopy(kind: string): string {
  if (kind === 'confirmed') return 'So‘rov tasdiqlandi; current membership faqat yangilangan read’dan olinadi.'
  if (kind === 'unknown') return 'Natija noma’lum; avtomatik qayta yuborish yo‘q. Read’ni yangilang.'
  if (kind === 'rejected') return 'Sintetik biznes rad javobi; deployed xato wire’i isbotlanmagan.'
  if (kind === 'pending') return 'Bitta sintetik mutation kutilmoqda.'
  if (kind === 'not-sent') return 'Amal yuborilmadi.'
  if (kind === 'stale') return 'Eski scope natijasi ko‘rsatilmaydi.'
  return 'Amal yuborilmagan.'
}

export function Day5CreatePreview({ simulator }: { readonly simulator: Day5Simulator }) {
  const runtime = useReadRuntime()
  const queryClient = useQueryClient()
  const lookupOptions = runtime.queries.terminalLookupOptions()
  const lookup = useQuery(lookupOptions)
  const [fullname, setFullname] = useState('D5-MGMT-DEMO New Cashier')
  const [phone, setPhone] = useState(simulator.getSnapshot().scenario === 'DUPLICATE_PHONE' ? '998901000001' : '998901000099')
  const [ids, setIds] = useState<string[]>([])
  const currentOptions = (): readonly TerminalOption[] | null => {
    const state = queryClient.getQueryState<readonly TerminalOption[]>(lookupOptions.queryKey)
    return simulator.has('terminal.lookup') && state?.status === 'success' && !state.isInvalidated ? state.data ?? null : null
  }
  const [controller] = useState(() => createCashierCreateController({
    currentScope: simulator.getCurrentScope, canCreate: () => simulator.has('cashier.create'),
    currentTerminalOptions: currentOptions, port: () => simulator.actionAvailable ? simulator.ports.create : null,
    invalidateConfirmed: async (scope) => invalidateCurrentCashierLists(queryClient, scope, simulator.has('cashier.read')),
  }))
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const [message, setMessage] = useState<string | null>(null)
  function submit() {
    void controller.submit({ fullname, phone, terminalIds: ids }).then((result) => {
      if (result.kind === 'not-sent') setMessage(result.reason)
    })
  }
  return <div className="mx-auto max-w-2xl space-y-4">
    <header><h2 className="text-2xl font-semibold">Sintetik kassir yaratish</h2><p className="text-sm text-text-secondary">Real create controller va fake port; telefon faqat RAM’da.</p></header>
    <label className="block space-y-1 text-sm">F.I.Sh.<Input value={fullname} onChange={(event) => setFullname(event.target.value)} /></label>
    <label className="block space-y-1 text-sm">Telefon<Input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
    <fieldset className="space-y-2"><legend className="text-sm font-medium">Joriy terminal lookup</legend>
      {lookup.data?.map((option) => <label key={option.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ids.includes(option.id)} onChange={(event) => setIds((current) => event.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id))} />{option.name}</label>)}
    </fieldset>
    {!simulator.has('terminal.lookup') || lookup.isError ? <p role="status">Terminal lookup mavjud emas; create DELETE/POST 0.</p> : null}
    <div className="flex flex-wrap gap-2"><Button type="button" disabled={state.outcome.kind === 'pending'} onClick={submit}>Sintetik kassir yaratish</Button>
      {state.outcome.kind === 'unknown' || state.outcome.kind === 'rejected' || state.outcome.kind === 'confirmed' ? <Button type="button" variant="outline" onClick={() => { if (controller.beginNewIntent()) { setFullname(''); setPhone(''); setIds([]); setMessage(null) } }}>Yangi intent</Button> : null}</div>
    {message ? <p role="alert">{message}</p> : null}
    <p role="status">{outcomeCopy(state.outcome.kind)}</p>
  </div>
}

function AssignPreview({ simulator, row, data, resultKey, dataUpdatedAt, onOutcome, isSelected }: {
  readonly simulator: Day5Simulator; readonly row: CashierRow; readonly data: Page<CashierRow>
  readonly resultKey: readonly unknown[]; readonly dataUpdatedAt: number; readonly onOutcome: (kind: string) => void
  readonly isSelected: () => boolean
}) {
  const runtime = useReadRuntime()
  const queryClient = useQueryClient()
  const lookupOptions = runtime.queries.terminalLookupOptions()
  const lookup = useQuery(lookupOptions)
  const [ids, setIds] = useState<string[]>([])
  const currentTarget = () => {
    const state = queryClient.getQueryState<Page<CashierRow>>(resultKey)
    return isSelected() ? resolveCurrentAssignTarget({ target: row, resultData: data,
      currentData: state?.status === 'success' ? state.data : undefined,
      dataUpdatedAt, currentUpdatedAt: state?.dataUpdatedAt, invalidated: state?.isInvalidated ?? true,
      scope: runtime.scope, currentScope: simulator.getCurrentScope(),
      canRead: simulator.has('cashier.read'), canAssign: simulator.has('cashier.assignTerminals') }) : null
  }
  const currentOptions = (): readonly TerminalOption[] | null => {
    const state = queryClient.getQueryState<readonly TerminalOption[]>(lookupOptions.queryKey)
    return simulator.has('terminal.lookup') && state?.status === 'success' && !state.isInvalidated ? state.data ?? null : null
  }
  const [controller] = useState(() => runtime.actionRegistry.getOrCreate(
    `d5.demo.assign:${runtime.scope.sessionScopeId}:${runtime.scope.accessRevision}:${JSON.stringify(resultKey)}:${dataUpdatedAt}:${row.id}`,
    () => createAssignTerminalsController({
    currentScope: simulator.getCurrentScope, currentTarget, currentOptions,
    canAssign: () => simulator.has('cashier.assignTerminals'),
    port: () => simulator.actionAvailable ? simulator.ports.assign : null,
    invalidateConfirmed: async (scope) => invalidateCurrentCashierLists(queryClient, scope, true),
  })))
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const available = lookup.data?.filter((option) => !row.terminals.some((active) => active.id === option.id)) ?? []
  return <section aria-label="Sintetik terminal biriktirish" className="space-y-2 border-t pt-3">
    <h4 className="font-semibold">Additive assign — real controller</h4>
    {available.map((option) => <label key={option.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ids.includes(option.id)} onChange={(event) => setIds((current) => event.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id))} />{option.name}</label>)}
    <Button type="button" disabled={state.outcome.kind !== 'idle'} onClick={() => {
      void controller.submit(ids).then((result) => { if (simulator.getCurrentScope() === runtime.scope && isSelected() && result.kind !== 'stale') onOutcome(result.kind) })
      if (simulator.getSnapshot().scenario === 'DELAYED_DOUBLE_SUBMIT') void controller.submit(ids)
    }}>Tanlangan terminalni qo‘shish</Button>
    <p role="status">{outcomeCopy(state.outcome.kind)}</p>
    {state.outcome.kind === 'unknown' ? <Button type="button" variant="outline" onClick={() => void queryClient.invalidateQueries({ queryKey: resultKey })}>Kassir holatini yangilash</Button> : null}
  </section>
}

function UnassignPreview({ simulator, target, data, resultKey, dataUpdatedAt, isSelected, onOutcome, onCancel }: {
  readonly simulator: Day5Simulator; readonly target: UnassignTarget; readonly data: Page<CashierRow>
  readonly resultKey: readonly unknown[]; readonly dataUpdatedAt: number; readonly isSelected: () => boolean
  readonly onOutcome: (kind: string) => void; readonly onCancel: () => void
}) {
  const runtime = useReadRuntime()
  const queryClient = useQueryClient()
  const currentTarget = () => {
    const state = queryClient.getQueryState<Page<CashierRow>>(resultKey)
    return isSelected() ? resolveCurrentUnassignTarget({ target, resultData: data,
      currentData: state?.status === 'success' ? state.data : undefined,
      dataUpdatedAt, currentUpdatedAt: state?.dataUpdatedAt, invalidated: state?.isInvalidated ?? true,
      scope: runtime.scope, currentScope: simulator.getCurrentScope(),
      canRead: simulator.has('cashier.read'), canUnassign: simulator.has('cashier.unassignTerminal'),
    }) : null
  }
  const [controller] = useState(() => runtime.actionRegistry.getOrCreate(
    `d5.demo.unassign:${runtime.scope.sessionScopeId}:${runtime.scope.accessRevision}:${JSON.stringify(resultKey)}:${dataUpdatedAt}:${target.cashier.id}:${target.terminal.id}`,
    () => createUnassignTerminalController({
    currentScope: simulator.getCurrentScope, currentTarget,
    canUnassign: () => simulator.has('cashier.unassignTerminal'),
    port: () => simulator.actionAvailable ? simulator.ports.unassign : null,
    invalidateConfirmed: async (scope) => invalidateCurrentCashierLists(queryClient, scope, true),
  })))
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  if (!currentTarget()) return null
  if (!controller.isCurrentSelection()) return <p role="status">Oldingi tanlov eskirdi. Kassir ro‘yxatini yangilang.</p>
  return <section aria-label="Sintetik ajratishni tasdiqlash" className="space-y-2 border-t pt-3">
    <h4 className="font-semibold">Bitta faol terminalni ajratish — real controller</h4>
    <p className="break-words text-sm">{target.cashier.fullname} kassirdan {target.terminal.name} (<span className="break-all">{target.terminal.id}</span>) biriktirilishini olib tashlashni tasdiqlaysizmi?</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={state.outcome.kind !== 'idle'} onClick={() => {
        if (!controller.armConfirmation()) return
        void controller.submit().then((result) => { if (simulator.getCurrentScope() === runtime.scope && isSelected() && result.kind !== 'stale') onOutcome(result.kind) })
        if (simulator.getSnapshot().scenario === 'DELAYED_DOUBLE_SUBMIT') void controller.submit()
      }}>Terminalni ajratishni tasdiqlash</Button>
      <Button type="button" variant="outline" onClick={onCancel} disabled={state.outcome.kind === 'pending'}>Bekor qilish</Button>
    </div>
    <p role="status">{outcomeCopy(state.outcome.kind)}</p>
    {state.outcome.kind === 'unknown' ? <Button type="button" variant="outline" onClick={() => void queryClient.invalidateQueries({ queryKey: resultKey })}>Kassir holatini yangilash</Button> : null}
  </section>
}

export function Day5CashierPreview({ simulator }: { readonly simulator: Day5Simulator }) {
  const runtime = useReadRuntime()
  const [draft, setDraft] = useState<CashierListFilters>(createDefaultCashierFilters)
  const [applied, setApplied] = useState<CashierListFilters>(createDefaultCashierFilters)
  const [filterMessage, setFilterMessage] = useState<string | null>(null)
  const merchants = useQuery(runtime.queries.merchantLookupOptions())
  const merchantState = !simulator.has('merchant.lookup') ? { kind: 'denied' as const }
    : merchants.isError ? { kind: 'error' as const }
      : merchants.data ? { kind: 'ready' as const, ids: merchants.data.map((item) => item.id) }
        : { kind: 'loading' as const }
  const draftTerminals = useQuery(runtime.queries.terminalLookupOptions(draft.merchantId))
  const appliedTerminals = useQuery(runtime.queries.terminalLookupOptions(applied.merchantId))
  const terminalState: LookupState = !simulator.has('terminal.lookup') ? 'denied'
    : appliedTerminals.isError ? 'error' : appliedTerminals.data ? 'ready' : 'loading'
  const parentReady = cashierParentState(applied.merchantId, merchantState) === 'ready'
  const baseOptions = runtime.queries.cashierListOptions(applied, { lookupParentId: applied.merchantId,
    lookupState: terminalState, optionIds: appliedTerminals.data?.map((item) => item.id) })
  const options = { ...baseOptions, queryKey: parentReady ? baseOptions.queryKey : [...baseOptions.queryKey, 'merchant-unconfirmed'],
    enabled: baseOptions.enabled && parentReady }
  const result = useQuery(options)
  const [selected, setSelected] = useState<CashierRow | null>(null)
  const selectedRef = useRef<CashierRow | null>(null)
  const selectedEpochRef = useRef(0)
  const [selectedEpoch, setSelectedEpoch] = useState(0)
  const [unassign, setUnassign] = useState<UnassignTarget | null>(null)
  const unassignRef = useRef<UnassignTarget | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const currentSelected = selected && result.data?.content.includes(selected) ? selected : null
  function applyFilters() {
    try {
      const next = applyCashierDraft(draft, { merchantIds: merchantState.kind === 'ready' ? merchantState.ids : undefined,
        terminal: { lookupParentId: draft.merchantId,
          lookupState: !simulator.has('terminal.lookup') ? 'denied' : draftTerminals.isError ? 'error' : draftTerminals.data ? 'ready' : 'loading',
          optionIds: draftTerminals.data?.map((item) => item.id) } })
      setApplied(next)
      setDraft(next)
      setFilterMessage(null)
      selectedRef.current = null
      unassignRef.current = null
      setSelected(null)
      setUnassign(null)
    } catch { setFilterMessage('Merchant yoki terminal tanlovi joriy lookup bilan tasdiqlanmadi.') }
  }
  return <div className="space-y-4">
    <header><h2 className="text-2xl font-semibold">Sintetik kassirlar</h2><p className="text-sm text-text-secondary">Server-side page va ACTIVE nested membership. Terminal filtri tarixiy match bo‘lishi mumkin.</p></header>
    <div className="grid gap-3 rounded-lg border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
      {merchantState.kind === 'ready' ? <label className="space-y-1 text-sm">Merchant
        <select className="block w-full rounded-lg border bg-surface p-2" value={draft.merchantId ?? ''}
          onChange={(event) => setDraft((current) => changeMerchantDraft(current, event.target.value || undefined))}>
          <option value="">Barcha merchantlar</option>{merchants.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label> : null}
      {draft.merchantId && draftTerminals.data ? <label className="space-y-1 text-sm">Terminal
        <select className="block w-full rounded-lg border bg-surface p-2" value={draft.terminalId ?? ''}
          onChange={(event) => setDraft((current) => ({ ...current, terminalId: event.target.value || undefined }))}>
          <option value="">Barcha terminallar</option>{draftTerminals.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label> : null}
      <label className="space-y-1 text-sm">Kassir F.I.Sh. yoki telefon<Input value={draft.search} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} /></label>
      <div className="flex flex-wrap items-end gap-2"><Button type="button" onClick={applyFilters}>Qo‘llash</Button>
        <Button type="button" variant="outline" onClick={() => { const next = clearManagementFilters(applied); selectedEpochRef.current++; setSelectedEpoch(selectedEpochRef.current); selectedRef.current = null; unassignRef.current = null; setSelected(null); setUnassign(null); setActionNotice(null); setDraft(next); setApplied(next); setFilterMessage(null) }}>Tozalash</Button></div>
      {filterMessage ? <p role="alert" className="text-sm sm:col-span-2 lg:col-span-4">{filterMessage}</p> : null}
      {!parentReady || (applied.terminalId && !baseOptions.enabled) ? <p role="status" className="text-sm sm:col-span-2 lg:col-span-4">Qo‘llangan parent/terminal tasdiqlanmaguncha filtered read to‘xtatiladi.</p> : null}
    </div>
    {actionNotice ? <p role="status" className="rounded-lg border p-3">{outcomeCopy(actionNotice)} {result.isError ? 'Cashier read xatosi alohida ko‘rsatiladi.' : ''}</p> : null}
    <CashierResults blocked={!parentReady || Boolean(applied.terminalId && !baseOptions.enabled)} pending={result.isPending} error={result.isError} data={result.data}
      selected={currentSelected} onRetry={() => void result.refetch()} onPageChange={(next) => { selectedEpochRef.current++; setSelectedEpoch(selectedEpochRef.current); selectedRef.current = null; unassignRef.current = null; setApplied((current) => changeManagementPage(current, next)); setSelected(null); setUnassign(null); setActionNotice(null) }}
      onSelect={(row) => { selectedEpochRef.current++; setSelectedEpoch(selectedEpochRef.current); selectedRef.current = row; unassignRef.current = null; setSelected(row); setUnassign(null); setActionNotice(null) }} onClose={() => { selectedEpochRef.current++; setSelectedEpoch(selectedEpochRef.current); selectedRef.current = null; unassignRef.current = null; setSelected(null); setUnassign(null); setActionNotice(null) }}
      onUnassign={currentSelected && simulator.has('cashier.unassignTerminal') ? (terminal) => { const target = { cashier: currentSelected, terminal }; unassignRef.current = target; setUnassign(target); setActionNotice(null) } : undefined}
      unassignSurface={currentSelected && unassign?.cashier === currentSelected && currentSelected.terminals.includes(unassign.terminal)
        ? <UnassignPreview key={`${options.queryKey.join(':')}:${result.dataUpdatedAt}:${unassign.cashier.id}:${unassign.terminal.id}`}
          simulator={simulator} target={unassign} data={result.data!} resultKey={options.queryKey} dataUpdatedAt={result.dataUpdatedAt}
          isSelected={() => selectedRef.current === unassign.cashier && unassignRef.current === unassign} onOutcome={setActionNotice} onCancel={() => { unassignRef.current = null; setUnassign(null) }} /> : null}
      assignSurface={currentSelected && result.data && simulator.has('cashier.assignTerminals')
        ? <AssignPreview key={`${options.queryKey.join(':')}:${result.dataUpdatedAt}:${currentSelected.id}`}
          simulator={simulator} row={currentSelected} data={result.data} resultKey={options.queryKey} dataUpdatedAt={result.dataUpdatedAt}
          isSelected={() => selectedRef.current === currentSelected && selectedEpochRef.current === selectedEpoch} onOutcome={setActionNotice} /> : null} />
  </div>
}
