import { useState, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import type { ReadRegistration } from '@/app/read/createLiveReadApi'
import { changeP5MerchantDraft, changeP5Page, changeP5Size, type P5Filters } from '@/shared/contracts/p5-filters'
import type { LookupState } from '@/shared/contracts/management-filters'
import type { P5Row } from '@/shared/contracts/p5-read'
import type { Page } from '@/shared/contracts/merchant-read'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { PageHeader } from '@/shared/ui/PageHeader'
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

type P5ResetController = ReturnType<typeof createP5ResetController>

function ResetControllerView({ controller }: { readonly controller: P5ResetController }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  return <P5ResetDialog state={state} onCancel={controller.dismiss} onConfirm={() => { void controller.confirm() }}
    onAcknowledgeUnknown={() => { controller.beginNewIntent(true) }} />
}

function ScopedP5Results({ rows, queryKey, runtime, resetPort, resetAvailable, pending, error, data, onRetry, onPageChange }: {
  readonly rows: readonly P5Row[]
  readonly queryKey: readonly unknown[]
  readonly runtime: ReturnType<typeof useReadRuntime>
  readonly resetPort: P5ResetPort | null
  readonly resetAvailable: boolean
  readonly pending: boolean
  readonly error: unknown
  readonly data: NonNullable<Parameters<typeof P5Results>[0]['data']>
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
    onRetry={onRetry} onPageChange={onPageChange}
    onSelect={(row) => setTarget(createP5Target(row, runtime.scope, queryKey))}
    resetAvailable={resetAvailable} onReset={requestReset} />
    {resetController ? <ResetControllerView controller={resetController} /> : null}
    {runtime.capabilities.p5ResetPin && !resetAvailable ? <p role="status" className="text-sm text-text-secondary">PIN reset funksiyasi hozir mavjud emas.</p> : null}
  </>
}

export function P5Page({ resetPort = null, resetRegistration }: { readonly resetPort?: P5ResetPort | null; readonly resetRegistration?: ReadRegistration } = {}) {
  const runtime = useReadRuntime()
  const [draft, setDraft] = useState<P5Filters>(createDefaultP5Filters)
  const [applied, setApplied] = useState<P5Filters>(createDefaultP5Filters)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

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

  function applyFilters() {
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
    } catch {
      setValidationMessage('Merchant, terminal yoki status kodi tasdiqlanmadi. Filtrlarni tekshiring yoki tozalang.')
    }
  }

  if (!runtime.capabilities.p5List) return <NoAccessState description="P5 qurilmalari ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.p5List.kind === 'unavailable') return <ErrorState title="P5 qurilmalari integratsiyasi sozlanmagan" />

  return <div className="mx-auto min-w-0 max-w-7xl space-y-5">
    <PageHeader
      title="P5 qurilmalari"
      description="Qidiruv faqat qurilma ID va terminal nomi bo‘yicha ishlaydi."
      descriptionId="p5-search-help"
    />
    <Card className="min-w-0"><CardHeader><CardTitle>Filterlar</CardTitle></CardHeader>
      <CardContent className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        {merchantLookupState.kind === 'ready' ? <label className="min-w-0 space-y-1 text-sm">Merchant
          <Select value={draft.merchantId ?? ''} onChange={(event) => setDraft((current) => changeP5MerchantDraft(current, event.target.value || undefined))}>
            <option value="">Barcha merchantlar</option>{merchants.data?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </Select>
        </label> : null}
        {draft.merchantId && draftTerminalState === 'ready' ? <label className="min-w-0 space-y-1 text-sm">Terminal
          <Select value={draft.terminalId ?? ''} onChange={(event) => setDraft((current) => ({ ...current, terminalId: event.target.value || undefined }))}>
            <option value="">Barcha terminallar</option>{draftTerminals.data?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </Select>
        </label> : null}
        <label className="min-w-0 space-y-1 text-sm">Status kodi
          <Input type="number" step={1} min={-2147483648} max={2147483647} value={draft.status ?? ''} aria-describedby={validationMessage ? 'p5-filter-error' : undefined} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value === '' ? undefined : Number(event.target.value) }))} placeholder="Masalan: 0" />
        </label>
        <label className="min-w-0 space-y-1 text-sm">Qurilma ID yoki terminal nomi
          <Input value={draft.search} aria-describedby="p5-search-help" onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Qurilma ID yoki terminal" />
        </label>
        <label className="min-w-0 space-y-1 text-sm">Sahifa hajmi
          <Select value={applied.size} onChange={(event) => {
            const size = event.target.value === '25' ? 25 : event.target.value === '50' ? 50 : 10
            setApplied((current) => changeP5Size(current, size))
            setDraft((current) => changeP5Size(current, size))
          }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></Select>
        </label>
        {merchantLookupState.kind !== 'ready' ? <p role="status" className="text-sm text-text-secondary sm:col-span-2">{merchantFilterMessage(merchantLookupState, Boolean(applied.merchantId))}</p> : null}
        {!draft.merchantId || draftTerminalState !== 'ready' ? <p role="status" className="text-sm text-text-secondary sm:col-span-2">Terminal filtri uchun merchant va terminal lookup ruxsatlari kerak; filtrsiz ro‘yxat ishlaydi.</p> : null}
        {validationMessage ? <p id="p5-filter-error" role="alert" className="text-sm text-destructive sm:col-span-2">{validationMessage}</p> : null}
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5">
          <Button type="button" onClick={applyFilters}>Qo‘llash</Button>
          <Button type="button" variant="outline" onClick={() => { const next = createDefaultP5Filters(); setDraft(next); setApplied(next); setValidationMessage(null) }}>Tozalash</Button>
        </div>
      </CardContent>
    </Card>
    {visibleData ? <ScopedP5Results key={p5SelectionKey(listOptions.queryKey, visibleData.content)} rows={visibleData.content} queryKey={listOptions.queryKey} runtime={runtime} resetPort={resetPort} resetAvailable={resetAvailable} pending={false} error={null} data={visibleData}
      onRetry={() => void list.refetch()} onPageChange={(page) => setApplied((current) => changeP5Page(current, page))} />
      : <P5Results blocked={blocked} pending={list.isPending} error={list.error} data={blocked || list.isError ? undefined : list.data} selected={null}
        onRetry={() => void list.refetch()} onPageChange={(page) => setApplied((current) => changeP5Page(current, page))} onSelect={() => undefined} />}
  </div>
}
