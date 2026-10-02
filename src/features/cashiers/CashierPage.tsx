import { useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserPlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RefreshIconButton } from '@/components/RefreshIconButton'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { formatInstantTime } from '@/shared/presentation/date-time'
import { useTableColumnPreferences } from '@/shared/table-columns/useTableColumnPreferences'
import { TableColumnPreferences } from '@/shared/ui/TableColumnPreferences'
import { can } from '@/shared/auth/access'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { changeManagementPage, clearManagementFilters, type CashierListFilters, type LookupState } from '@/shared/contracts/management-filters'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope, TerminalOption } from '@/shared/contracts/merchant-read'
import { applyCashierAdvancedDraft, applyCashierQuickSearch, reconcileCashierAdvancedDraft, cashierParentState, cashierSelectionKey, createCashierTarget, createDefaultCashierFilters, resolveCashierTarget, type CashierAdvancedDraft, type CashierTarget, type MerchantLookupState } from './page-state'
import { CashierAdvancedFilterFields, CashierQuickSearch } from './CashierFilterControls'
import { resolveLookupSelectState } from '@/shared/ui/lookup-select-state'
import { CashierResults } from './CashierResults'
import { AssignTerminalsPanel } from './AssignTerminalsPanel'
import { UnassignTerminalPanel } from './UnassignTerminalPanel'
import type { UnassignTarget } from './unassign-terminal'
import { cashierColumns } from './columns'
import { CreateCashierDialog } from './CreateCashierDialog'

function terminalLookupState(enabled: boolean, error: boolean, data: readonly TerminalOption[] | undefined, granted: boolean): LookupState {
  if (!enabled) return granted ? 'unavailable' : 'denied'
  if (error) return 'error'
  return data ? 'ready' : 'loading'
}

function ScopedCashierResults({ data, scope, resultKey, dataUpdatedAt, getCurrentScope,
  columnOrder, visibleColumnIds, onRetry, onPageChange, headerActions, quickFilters }: {
  readonly data: Page<CashierRow>
  readonly scope: ReadScope
  readonly resultKey: readonly unknown[]
  readonly dataUpdatedAt: number
  readonly getCurrentScope: () => ReadScope
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly headerActions: ReactNode
  readonly quickFilters: ReactNode
}) {
  const access = useAccessContext()
  const [selectedTarget, setSelectedTarget] = useState<CashierTarget | null>(null)
  const selectedCashierRef = useRef<CashierRow | null>(null)
  const selectedEpochRef = useRef(0)
  const [assignNotice, setAssignNotice] = useState<string | null>(null)
  const [unassignSelection, setUnassignSelection] = useState<{ target: UnassignTarget; epoch: number } | null>(null)
  const [unassignNotice, setUnassignNotice] = useState<string | null>(null)
  const selected = resolveCashierTarget(selectedTarget, scope, data.content, true)
  const currentUnassign = selected && unassignSelection?.target.cashier === selected && selected.terminals.includes(unassignSelection.target.terminal)
    ? unassignSelection.target : null
  return <CashierResults blocked={false} pending={false} error={false} data={data} selected={selected}
    columnOrder={columnOrder} visibleColumnIds={visibleColumnIds}
    onRetry={onRetry} onPageChange={onPageChange}
    headerActions={headerActions}
    quickFilters={quickFilters}
    onSelect={(row) => { selectedEpochRef.current++; selectedCashierRef.current = row; setAssignNotice(null); setUnassignNotice(null); setUnassignSelection(null); setSelectedTarget(createCashierTarget(row, getCurrentScope())) }}
    onClose={() => { selectedEpochRef.current++; selectedCashierRef.current = null; setAssignNotice(null); setUnassignNotice(null); setUnassignSelection(null); setSelectedTarget(null) }}
    onUnassign={selected !== null && can(access, 'cashier.unassignTerminal', false)
      ? (terminal) => { selectedEpochRef.current++; selectedCashierRef.current = selected; setUnassignNotice(null); setUnassignSelection({ target: { cashier: selected, terminal }, epoch: selectedEpochRef.current }) } : undefined}
    unassignSurface={selected !== null && can(access, 'cashier.unassignTerminal', false)
      ? <>{unassignNotice === selected.id ? <p role="status">Terminalni ajratish so‘rovi tasdiqlandi. Joriy faol biriktirishlar yangilangach tekshiriladi.</p> : null}
        {currentUnassign ? <UnassignTerminalPanel key={JSON.stringify([scope.source, scope.sessionScopeId, scope.accessRevision, resultKey, dataUpdatedAt, currentUnassign.cashier.id, currentUnassign.terminal.id, currentUnassign.cashier.terminals.indexOf(currentUnassign.terminal)])}
        target={currentUnassign} resultData={data} resultKey={resultKey} dataUpdatedAt={dataUpdatedAt} scope={scope}
        isSelected={() => selectedCashierRef.current === currentUnassign.cashier && selectedEpochRef.current === unassignSelection?.epoch}
        onRefresh={onRetry} onCancel={() => setUnassignSelection(null)} onConfirmed={() => setUnassignNotice(selected.id)} /> : null}</> : null}
    assignSurface={selected !== null && can(access, 'cashier.assignTerminals', false)
      ? <>{assignNotice === selected.id ? <p role="status">Terminallar biriktirildi. Faol biriktirishlar ro‘yxati yangilangach tekshiriladi.</p> : null}
        <AssignTerminalsPanel key={JSON.stringify([scope.source, scope.sessionScopeId, scope.accessRevision, resultKey, dataUpdatedAt, selected.id])}
          target={selected} resultData={data} resultKey={resultKey} dataUpdatedAt={dataUpdatedAt} scope={scope} onRefresh={onRetry} onConfirmed={() => setAssignNotice(selected.id)} /></> : null} />
}

export function CashierPage() {
  const runtime = useReadRuntime()
  const access = useAccessContext()
  const canCreate = can(access, 'cashier.create', false)
  const [createScope, setCreateScope] = useState<ReadScope | null>(null)
  const createTrigger = useRef<HTMLButtonElement | null>(null)
  const createOpen = canCreate && createScope !== null &&
    createScope.source === runtime.scope.source && createScope.sessionScopeId === runtime.scope.sessionScopeId &&
    createScope.accessRevision === runtime.scope.accessRevision
  const [draft, setDraft] = useState<CashierAdvancedDraft>({})
  const [searchDraft, setSearchDraft] = useState('')
  const [applied, setApplied] = useState<CashierListFilters>(createDefaultCashierFilters)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const columnPreferences = useTableColumnPreferences({
    tableKey: 'cashiers',
    columns: cashierColumns,
  })

  const merchantBase = runtime.queries.merchantLookupOptions()
  const merchantOptions = { ...merchantBase, enabled: merchantBase.enabled && runtime.capabilities.cashierList }
  const merchants = useQuery(merchantOptions)
  const merchantLookupState: MerchantLookupState = !merchantOptions.enabled
    ? { kind: runtime.capabilities.merchantLookup ? 'unavailable' : 'denied' }
    : merchants.isError ? { kind: 'error' }
      : merchants.data ? { kind: 'ready', ids: merchants.data.map((option) => option.id) }
        : { kind: 'loading' }

  const draftTerminalBase = runtime.queries.terminalLookupOptions(draft.merchantId)
  const draftTerminalOptions = { ...draftTerminalBase, enabled: draftTerminalBase.enabled && runtime.capabilities.cashierList && Boolean(draft.merchantId) && cashierParentState(draft.merchantId, merchantLookupState) === 'ready' }
  const draftTerminals = useQuery(draftTerminalOptions)
  const draftTerminalState = terminalLookupState(draftTerminalOptions.enabled, draftTerminals.isError, draftTerminals.data, runtime.capabilities.terminalLookup)
  const draftTerminalGate = { lookupParentId: draft.merchantId, lookupState: draftTerminalState,
    optionIds: draftTerminals.data?.map((option) => option.id) }
  const reconciledDraft = reconcileCashierAdvancedDraft(draft, merchantLookupState, draftTerminalGate)
  const merchantPresentation = resolveLookupSelectState({ enabled: merchantOptions.enabled,
    pending: merchants.isPending, error: merchants.isError, ids: merchants.data?.map((option) => option.id) })
  const terminalPresentation = resolveLookupSelectState({ enabled: draftTerminalOptions.enabled,
    pending: draftTerminals.isPending, error: draftTerminals.isError, ids: draftTerminalGate.optionIds })

  const appliedParentReady = cashierParentState(applied.merchantId, merchantLookupState) === 'ready'
  const appliedTerminalBase = runtime.queries.terminalLookupOptions(applied.merchantId)
  const appliedTerminalOptions = { ...appliedTerminalBase, enabled: appliedTerminalBase.enabled && runtime.capabilities.cashierList && Boolean(applied.terminalId) && appliedParentReady }
  const appliedTerminals = useQuery(appliedTerminalOptions)
  const appliedTerminalState = terminalLookupState(appliedTerminalOptions.enabled, appliedTerminals.isError, appliedTerminals.data, runtime.capabilities.terminalLookup)
  const listBase = runtime.queries.cashierListOptions(applied, {
    lookupParentId: applied.merchantId,
    lookupState: appliedTerminalState,
    optionIds: appliedTerminals.data?.map((option) => option.id),
  })
  const listOptions = { ...listBase, queryKey: appliedParentReady ? listBase.queryKey : [...listBase.queryKey, 'merchant-unconfirmed'], enabled: listBase.enabled && appliedParentReady }
  const list = useQuery(listOptions)
  const blocked = !appliedParentReady || (Boolean(applied.terminalId) && !listBase.enabled)
  const visibleData = !blocked && !list.isPending && !list.isError && runtime.capabilities.cashierList ? list.data : undefined

  function applyFilters(): boolean {
    try {
      const next = applyCashierAdvancedDraft(applied, draft, {
        merchantIds: merchantLookupState.kind === 'ready' ? merchantLookupState.ids : undefined,
        terminal: draftTerminalGate,
      })
      setDraft({ merchantId: next.merchantId, terminalId: next.terminalId })
      setApplied(next)
      setValidationMessage(null)
      return true
    } catch {
      setValidationMessage('Tanlangan merchant yoki terminal tasdiqlanmadi. Filtrni yangilang yoki tozalang.')
      return false
    }
  }

  function resetFilters() {
    const next = clearManagementFilters(applied)
    setDraft({})
    setSearchDraft('')
    setApplied(next)
    setValidationMessage(null)
  }

  function renderQuickSearch() {
    return <CashierQuickSearch searchDraft={searchDraft} onDraftChange={setSearchDraft} onApply={(search) => {
      setSearchDraft(search.trim())
      setApplied((current) => applyCashierQuickSearch(current, search))
    }} />
  }

  function renderHeaderActions() {
    return <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
      {canCreate ? <Button ref={createTrigger} type="button" size="sm" aria-label="Yangi kassir yaratish" aria-haspopup="dialog"
        aria-expanded={createOpen} onClick={() => setCreateScope(runtime.getCurrentScope())}>
        <UserPlusIcon aria-hidden="true" />Yangi kassir
      </Button> : null}
      <FilterDrawer onApply={applyFilters} onReset={resetFilters} triggerSize="sm">
        <CashierAdvancedFilterFields draft={reconciledDraft} merchants={merchants.data} terminals={draftTerminals.data}
          merchantState={merchantPresentation} terminalState={terminalPresentation} onChange={setDraft} appliedTerminalId={applied.terminalId}
          onReconcileDraft={reconciledDraft !== draft ? () => setDraft(reconciledDraft) : undefined} />
        {validationMessage ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{validationMessage}</p> : null}
      </FilterDrawer>
      <TableColumnPreferences
        tableLabel="Kassirlar"
        items={cashierColumns}
        order={columnPreferences.order}
        hidden={columnPreferences.hidden}
        iconOnly
        onMoveUp={columnPreferences.moveUp}
        onMoveDown={columnPreferences.moveDown}
        onMove={columnPreferences.move}
        onToggleVisibility={columnPreferences.toggleVisibility}
        canHide={columnPreferences.canHide}
        onReset={columnPreferences.reset}
      />
      <RefreshIconButton
        updatedTime={list.dataUpdatedAt > 0 ? formatInstantTime(list.dataUpdatedAt) : '—'}
        disabled={!listOptions.enabled || list.isFetching}
        loading={list.isFetching}
        onClick={() => void list.refetch()}
      />
    </div>
  }

  if (!runtime.capabilities.cashierList) return <NoAccessState description="Kassirlar ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.cashierList.kind === 'unavailable') return <ErrorState title="Kassirlar integratsiyasi sozlanmagan" />

  return <div className="mx-auto min-w-0 max-w-7xl">
    {visibleData ? <ScopedCashierResults key={cashierSelectionKey(listOptions.queryKey, visibleData)} data={visibleData} scope={runtime.scope} resultKey={listOptions.queryKey} dataUpdatedAt={list.dataUpdatedAt} getCurrentScope={runtime.getCurrentScope}
      columnOrder={columnPreferences.order} visibleColumnIds={columnPreferences.visible}
      onRetry={() => void list.refetch()} onPageChange={(page) => setApplied((current) => changeManagementPage(current, page))}
      headerActions={renderHeaderActions()} quickFilters={renderQuickSearch()} />
      : <CashierResults blocked={blocked} pending={list.isPending} error={list.isError} data={list.data} selected={null}
        columnOrder={columnPreferences.order} visibleColumnIds={columnPreferences.visible}
        onRetry={() => void list.refetch()} onPageChange={(page) => setApplied((current) => changeManagementPage(current, page))}
        onSelect={() => undefined} onClose={() => undefined} headerActions={renderHeaderActions()} quickFilters={renderQuickSearch()} />}
    {createOpen ? <CreateCashierDialog key={JSON.stringify(createScope)} onClose={() => setCreateScope(null)}
      onCloseAutoFocus={(event) => {
        if (createTrigger.current?.isConnected) { event.preventDefault(); createTrigger.current.focus() }
      }} /> : null}
  </div>
}
