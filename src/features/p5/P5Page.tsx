import { useState, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshIconButton } from '@/components/RefreshIconButton'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import type { ReadRegistration } from '@/app/read/createLiveReadApi'
import { changeP5Page, type P5Filters as P5FilterValues } from '@/shared/contracts/p5-filters'
import type { LookupState } from '@/shared/contracts/management-filters'
import type { P5Row } from '@/shared/contracts/p5-read'
import type { Page } from '@/shared/contracts/merchant-read'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { formatInstantTime } from '@/shared/presentation/date-time'
import { useTableColumnPreferences } from '@/shared/table-columns/useTableColumnPreferences'
import { TableColumnPreferences } from '@/shared/ui/TableColumnPreferences'
import {
  applyP5AdvancedDraft,
  applyP5QuickSearch,
  createP5AdvancedDraft,
  reconcileP5AdvancedDraft,
  isP5StatusDraftValid,
  type P5AdvancedDraft,
  createDefaultP5Filters,
  createP5Target,
  p5ParentState,
  p5SelectionKey,
  resolveP5Target,
  type MerchantLookupState,
  type P5Target,
} from './page-state'
import { P5Results } from './P5Results'
import { P5ResetDialog } from './P5ResetDialog'
import { createP5ResetController, invalidateCurrentP5Lists, p5ResetIntentKey, type P5ResetPort } from './p5-reset'
import { p5Columns } from './columns'
import { P5AdvancedFilterFields, P5QuickSearch } from './P5FilterControls'
import { resolveLookupSelectState } from '@/shared/ui/lookup-select-state'

function terminalLookupState(enabled: boolean, error: boolean, data: readonly unknown[] | undefined, granted: boolean): LookupState {
  if (!enabled) return granted ? 'unavailable' : 'denied'
  if (error) return 'error'
  return data ? 'ready' : 'loading'
}

export function P5Filters(props: Parameters<typeof P5AdvancedFilterFields>[0]) {
  return <P5AdvancedFilterFields {...props} />
}

type P5ResetController = ReturnType<typeof createP5ResetController>

function ResetControllerView({ controller }: { readonly controller: P5ResetController }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  return <P5ResetDialog state={state} onCancel={controller.dismiss} onConfirm={() => { void controller.confirm() }}
    onAcknowledgeUnknown={() => { controller.beginNewIntent(true) }} />
}

function ScopedP5Results({ rows, queryKey, runtime, resetPort, resetAvailable,
  resetUnavailableMessage, pending, error, data, columnOrder, visibleColumnIds,
  onRetry, onPageChange }: {
  readonly rows: readonly P5Row[]
  readonly queryKey: readonly unknown[]
  readonly runtime: ReturnType<typeof useReadRuntime>
  readonly resetPort: P5ResetPort | null
  readonly resetAvailable: boolean
  readonly resetUnavailableMessage: string | undefined
  readonly pending: boolean
  readonly error: unknown
  readonly data: NonNullable<Parameters<typeof P5Results>[0]['data']>
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
}) {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<P5Target | null>(null)
  const [resetController, setResetController] = useState<P5ResetController | null>(null)
  const selected = resolveP5Target(target, runtime.scope, queryKey, rows, runtime.capabilities.p5List)
  const currentRow = (deviceId: string): P5Row | null => {
    const current = queryClient.getQueryState<Page<P5Row>>(queryKey)
    if (current?.status !== 'success' || current.isInvalidated) return null
    const matches = current.data?.content.filter((row) => row.deviceId === deviceId) ?? []
    return matches.length === 1 ? matches[0] : null
  }
  function requestReset(row: P5Row) {
    const controller = runtime.actionRegistry.getOrCreate(p5ResetIntentKey(runtime.scope, row.deviceId), () => createP5ResetController({
      currentScope: runtime.getCurrentScope,
      canRead: () => runtime.capabilities.p5List,
      canReset: () => runtime.capabilities.p5ResetPin,
      currentRow,
      port: () => resetAvailable ? resetPort : null,
      invalidateConfirmed: (scope) => invalidateCurrentP5Lists(queryClient, scope, runtime.capabilities.p5List),
    }))
    if (controller.request(row)) setResetController(controller)
  }
  return <><P5Results blocked={false} pending={pending} error={error} data={data} selected={selected}
    columnOrder={columnOrder} visibleColumnIds={visibleColumnIds}
    onRetry={onRetry} onPageChange={onPageChange}
    onSelect={(row) => setTarget(createP5Target(row, runtime.scope, queryKey))}
    resetAvailable={resetAvailable} resetUnavailableMessage={resetUnavailableMessage} onReset={requestReset} />
    {resetController ? <ResetControllerView controller={resetController} /> : null}
  </>
}

export function P5Page({ resetPort = null, resetRegistration }: { readonly resetPort?: P5ResetPort | null; readonly resetRegistration?: ReadRegistration } = {}) {
  const runtime = useReadRuntime()
  const [draft, setDraft] = useState<P5AdvancedDraft>(() => createP5AdvancedDraft())
  const [searchDraft, setSearchDraft] = useState('')
  const [applied, setApplied] = useState<P5FilterValues>(createDefaultP5Filters)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const columnPreferences = useTableColumnPreferences({
    tableKey: 'p5Devices',
    columns: p5Columns,
  })

  const merchantBase = runtime.queries.merchantLookupOptions()
  const merchantOptions = { ...merchantBase, enabled: merchantBase.enabled && runtime.capabilities.p5List }
  const merchants = useQuery(merchantOptions)
  const merchantLookupState: MerchantLookupState = !merchantOptions.enabled
    ? { kind: runtime.capabilities.merchantLookup ? 'unavailable' : 'denied' }
    : merchants.isError ? { kind: 'error' }
      : merchants.data ? { kind: 'ready', ids: merchants.data.map((option) => option.id) }
        : { kind: 'loading' }

  const draftTerminalBase = runtime.queries.terminalLookupOptions(draft.merchantId)
  const draftTerminalOptions = {
    ...draftTerminalBase,
    enabled: draftTerminalBase.enabled && runtime.capabilities.p5List && Boolean(draft.merchantId) && p5ParentState(draft.merchantId, merchantLookupState) === 'ready',
  }
  const draftTerminals = useQuery(draftTerminalOptions)
  const draftTerminalState = terminalLookupState(draftTerminalOptions.enabled, draftTerminals.isError, draftTerminals.data, runtime.capabilities.terminalLookup)
  const draftTerminalGate = { lookupParentId: draft.merchantId, lookupState: draftTerminalState,
    optionIds: draftTerminals.data?.map((option) => option.id) }
  const reconciledDraft = reconcileP5AdvancedDraft(draft, merchantLookupState, draftTerminalGate)
  const merchantPresentation = resolveLookupSelectState({ enabled: merchantOptions.enabled,
    pending: merchants.isPending, error: merchants.isError, ids: merchants.data?.map((option) => option.id) })
  const terminalPresentation = resolveLookupSelectState({ enabled: draftTerminalOptions.enabled,
    pending: draftTerminals.isPending, error: draftTerminals.isError, ids: draftTerminalGate.optionIds })

  const appliedParentReady = p5ParentState(applied.merchantId, merchantLookupState) === 'ready'
  const appliedTerminalBase = runtime.queries.terminalLookupOptions(applied.merchantId)
  const appliedTerminalOptions = {
    ...appliedTerminalBase,
    enabled: appliedTerminalBase.enabled && runtime.capabilities.p5List && Boolean(applied.terminalId) && appliedParentReady,
  }
  const appliedTerminals = useQuery(appliedTerminalOptions)
  const appliedTerminalState = terminalLookupState(appliedTerminalOptions.enabled, appliedTerminals.isError, appliedTerminals.data, runtime.capabilities.terminalLookup)

  const listBase = runtime.queries.p5ListOptions(applied, {
    lookupParentId: applied.merchantId,
    lookupState: appliedTerminalState,
    optionIds: appliedTerminals.data?.map((option) => option.id),
  })
  const listOptions = {
    ...listBase,
    queryKey: appliedParentReady ? listBase.queryKey : [...listBase.queryKey, 'merchant-unconfirmed'],
    enabled: listBase.enabled && appliedParentReady,
  }
  const list = useQuery(listOptions)
  const blocked = !appliedParentReady || (Boolean(applied.terminalId) && !listBase.enabled)
  const visibleData = !blocked && !list.isPending && !list.isError && runtime.capabilities.p5List ? list.data : undefined
  const resetReady = (resetRegistration ?? runtime.readiness.p5Reset).kind === 'configured'
  const resetAvailable = runtime.capabilities.p5ResetPin && resetReady && Boolean(resetPort)

  function applyFilters(): boolean {
    try {
      const next = applyP5AdvancedDraft(applied, draft, {
        merchantIds: merchantLookupState.kind === 'ready' ? merchantLookupState.ids : undefined,
        terminal: draftTerminalGate,
      })
      setDraft(createP5AdvancedDraft(next))
      setApplied(next)
      setValidationMessage(null)
      return true
    } catch {
      setValidationMessage('Merchant, terminal yoki status kodi tasdiqlanmadi. Filtrlarni tekshiring yoki tozalang.')
      return false
    }
  }

  function resetFilters() {
    const next = createDefaultP5Filters()
    setDraft(createP5AdvancedDraft(next))
    setSearchDraft('')
    setApplied(next)
    setValidationMessage(null)
  }

  if (!runtime.capabilities.p5List) return <NoAccessState description="P5 qurilmalari ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.p5List.kind === 'unavailable') return <ErrorState title="P5 qurilmalari integratsiyasi sozlanmagan" />

  const resetUnavailableMessage = runtime.capabilities.p5ResetPin && !resetAvailable
    ? 'PIN reset funksiyasi hozir mavjud emas.'
    : undefined

  return <div className="mx-auto min-w-0 max-w-7xl space-y-4">
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <P5QuickSearch searchDraft={searchDraft} onDraftChange={setSearchDraft} onApply={(search) => {
        setSearchDraft(search.trim())
        setApplied((current) => applyP5QuickSearch(current, search))
      }} />
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <FilterDrawer onApply={applyFilters} onReset={resetFilters} triggerSize="sm" applyDisabled={!isP5StatusDraftValid(draft.statusDraft)}>
          <P5Filters
            draft={reconciledDraft}
            merchantState={merchantPresentation}
            merchants={merchants.data}
            terminalState={terminalPresentation}
            terminals={draftTerminals.data}
            validationMessage={validationMessage}
            onChange={setDraft}
            onReconcileDraft={reconciledDraft !== draft ? () => setDraft(reconciledDraft) : undefined}
          />
        </FilterDrawer>
        <TableColumnPreferences
          tableLabel="P5 qurilmalari"
          items={p5Columns}
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
    </div>
    {visibleData ? <ScopedP5Results key={p5SelectionKey(listOptions.queryKey, visibleData.content)} rows={visibleData.content} queryKey={listOptions.queryKey} runtime={runtime} resetPort={resetPort} resetAvailable={resetAvailable} pending={false} error={null} data={visibleData}
      resetUnavailableMessage={resetUnavailableMessage}
      columnOrder={columnPreferences.order} visibleColumnIds={columnPreferences.visible}
      onRetry={() => void list.refetch()} onPageChange={(page) => setApplied((current) => changeP5Page(current, page))} />
      : <P5Results blocked={blocked} pending={list.isPending} error={list.error} data={blocked || list.isError ? undefined : list.data} selected={null}
        columnOrder={columnPreferences.order} visibleColumnIds={columnPreferences.visible}
        onRetry={() => void list.refetch()} onPageChange={(page) => setApplied((current) => changeP5Page(current, page))} onSelect={() => undefined} />}
  </div>
}
