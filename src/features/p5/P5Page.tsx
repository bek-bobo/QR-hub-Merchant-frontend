import { useState, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RefreshIconButton } from '@/components/RefreshIconButton'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import type { ReadRegistration } from '@/app/read/createLiveReadApi'
import { changeP5MerchantDraft, changeP5Page, type P5Filters as P5FilterValues } from '@/shared/contracts/p5-filters'
import type { LookupState } from '@/shared/contracts/management-filters'
import type { P5Row } from '@/shared/contracts/p5-read'
import type { Page } from '@/shared/contracts/merchant-read'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { formatInstantTime } from '@/shared/presentation/date-time'
import { useTableColumnPreferences } from '@/shared/table-columns/useTableColumnPreferences'
import { TableColumnPreferences } from '@/shared/ui/TableColumnPreferences'
import {
  applyP5Draft,
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

function terminalLookupState(enabled: boolean, error: boolean, data: readonly unknown[] | undefined, granted: boolean): LookupState {
  if (!enabled) return granted ? 'unavailable' : 'denied'
  if (error) return 'error'
  return data ? 'ready' : 'loading'
}

function merchantFilterMessage(state: Exclude<MerchantLookupState, { readonly kind: 'ready'; readonly ids: readonly string[] }>, hasAppliedMerchant: boolean): string {
  const availability = state.kind === 'denied'
    ? 'uchun ruxsat yo‘q'
    : state.kind === 'loading' ? 'yuklanmoqda' : 'hozir mavjud emas'
  const consequence = hasAppliedMerchant
    ? 'qo‘llangan filtr tasdiqlanmaguncha ro‘yxat to‘xtatiladi.'
    : 'filtrsiz ro‘yxat ishlaydi.'
  return `Merchant filtri ${availability}; ${consequence}`
}

interface P5FiltersProps {
  readonly draft: P5FilterValues
  readonly applied: P5FilterValues
  readonly merchantLookupState: MerchantLookupState
  readonly merchants: readonly { readonly id: string; readonly name: string }[] | undefined
  readonly draftTerminalState: LookupState
  readonly draftTerminals: readonly { readonly id: string; readonly name: string }[] | undefined
  readonly validationMessage: string | null
  readonly onDraftChange: Dispatch<SetStateAction<P5FilterValues>>
}

export function P5Filters({
  draft,
  applied,
  merchantLookupState,
  merchants,
  draftTerminalState,
  draftTerminals,
  validationMessage,
  onDraftChange,
}: P5FiltersProps) {
  return <>
    {merchantLookupState.kind === 'ready' ? <label className="block min-w-0 space-y-1 text-sm">Merchant
      <Select value={draft.merchantId ?? ''} onChange={(event) => onDraftChange((current) => changeP5MerchantDraft(current, event.target.value || undefined))}>
        <option value="">Barcha merchantlar</option>{merchants?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </Select>
    </label> : null}
    {draft.merchantId && draftTerminalState === 'ready' ? <label className="block min-w-0 space-y-1 text-sm">Terminal
      <Select value={draft.terminalId ?? ''} onChange={(event) => onDraftChange((current) => ({ ...current, terminalId: event.target.value || undefined }))}>
        <option value="">Barcha terminallar</option>{draftTerminals?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </Select>
    </label> : null}
    <label className="block min-w-0 space-y-1 text-sm">Status kodi
      <Input type="number" step={1} min={-2147483648} max={2147483647} value={draft.status ?? ''} aria-describedby={validationMessage ? 'p5-filter-error' : undefined} onChange={(event) => onDraftChange((current) => ({ ...current, status: event.target.value === '' ? undefined : Number(event.target.value) }))} placeholder="Masalan: 0" />
    </label>
    <label className="block min-w-0 space-y-1 text-sm">Qurilma ID yoki terminal nomi
      <Input value={draft.search} onChange={(event) => onDraftChange((current) => ({ ...current, search: event.target.value }))} placeholder="Qurilma ID yoki terminal" />
    </label>
    {merchantLookupState.kind !== 'ready' ? <p role="status" className="text-sm text-text-secondary sm:col-span-2">{merchantFilterMessage(merchantLookupState, Boolean(applied.merchantId))}</p> : null}
    {!draft.merchantId || draftTerminalState !== 'ready' ? <p role="status" className="text-sm text-text-secondary sm:col-span-2">Terminal filtri uchun merchant va terminal lookup ruxsatlari kerak; filtrsiz ro‘yxat ishlaydi.</p> : null}
    {validationMessage ? <p id="p5-filter-error" role="alert" className="text-sm text-destructive sm:col-span-2">{validationMessage}</p> : null}
  </>
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
  const [draft, setDraft] = useState<P5FilterValues>(createDefaultP5Filters)
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
      const next = applyP5Draft(draft, {
        merchantIds: merchantLookupState.kind === 'ready' ? merchantLookupState.ids : undefined,
        terminal: {
          lookupParentId: draft.merchantId,
          lookupState: draftTerminalState,
          optionIds: draftTerminals.data?.map((option) => option.id),
        },
      })
      setDraft(next)
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
    setDraft(next)
    setApplied(next)
    setValidationMessage(null)
  }

  if (!runtime.capabilities.p5List) return <NoAccessState description="P5 qurilmalari ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.p5List.kind === 'unavailable') return <ErrorState title="P5 qurilmalari integratsiyasi sozlanmagan" />

  const resetUnavailableMessage = runtime.capabilities.p5ResetPin && !resetAvailable
    ? 'PIN reset funksiyasi hozir mavjud emas.'
    : undefined

  return <div className="mx-auto min-w-0 max-w-7xl space-y-4">
    <div className="flex min-w-0 flex-col gap-2 sm:items-end">
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <FilterDrawer onApply={applyFilters} onReset={resetFilters} triggerSize="sm">
          <P5Filters
            draft={draft}
            applied={applied}
            merchantLookupState={merchantLookupState}
            merchants={merchants.data}
            draftTerminalState={draftTerminalState}
            draftTerminals={draftTerminals.data}
            validationMessage={validationMessage}
            onDraftChange={setDraft}
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
