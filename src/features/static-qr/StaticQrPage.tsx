import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { can } from '@/shared/auth/access'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { createHttpTransport, validateWebBaseUrl } from '@/shared/api/http'
import { RefreshIconButton } from '@/components/RefreshIconButton'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { formatInstantTime } from '@/shared/presentation/date-time'
import { useTableColumnPreferences } from '@/shared/table-columns/useTableColumnPreferences'
import { TableColumnPreferences } from '@/shared/ui/TableColumnPreferences'
import { applyStaticQrAdvancedDraft, applyStaticQrQuickSearch, clearStaticTerminal,
  defaultStaticFilters, type StaticQrAdvancedDraft, type StaticQrFilters } from './page-state'
import { StaticQrAdvancedFilterFields, StaticQrQuickSearch } from './StaticQrFilterControls'
import { useStaticQrFilterLookups } from './filter-lookups'
import { createStaticQrQueryOptions } from './query'
import { StaticQrResults } from './StaticQrResults'
import type { StaticQrRow } from './contract'
import { StaticQrDisplayDialog } from './StaticQrDisplayDialog'
import { StaticQrDetailsSheet } from './StaticQrDetailsSheet'
import { staticQrColumns } from './columns'

export function StaticQrPage() {
  const runtime = useReadRuntime()
  const access = useAccessContext()
  const { bridge, getSessionSnapshot } = useProtectedReadContext()
  const [draft, setDraft] = useState<StaticQrAdvancedDraft>({})
  const [searchDraft, setSearchDraft] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [applied, setApplied] = useState<StaticQrFilters>(defaultStaticFilters)
  const [selectedQrRow, setSelectedQrRow] = useState<StaticQrRow | null>(null)
  const [selectedDetailsRow, setSelectedDetailsRow] = useState<StaticQrRow | null>(null)
  const columnPreferences = useTableColumnPreferences({
    tableKey: 'staticQr',
    columns: staticQrColumns,
  })
  const base = validateWebBaseUrl(import.meta.env.VITE_WEB_API_BASE_URL,
    import.meta.env.DEV ? 'development' : 'production')
  const baseUrl = base.kind === 'valid' ? base.value : null
  const transport = useMemo(() => baseUrl
    ? createHttpTransport({ service: 'web', baseUrl }) : null,
    [baseUrl])
  const staticReadAllowed = can(access, 'staticQr.read', false)
  const lookups = useStaticQrFilterLookups(draft, applied, staticReadAllowed)
  const selectedValid = lookups.appliedConfirmed
  const listOptions = createStaticQrQueryOptions({
    scope: runtime.scope, currentScope: runtime.getCurrentScope, filters: applied,
    staticReadAllowed, authReady: runtime.readiness.auth.kind === 'configured',
    terminalConfirmed: selectedValid, transport, bridge, getSessionSnapshot,
  })
  const list = useQuery(listOptions)

  function applyFilters(): boolean {
    const next = applyStaticQrAdvancedDraft(applied, lookups.reconciledDraft, lookups.validation)
    if (!next) {
      setValidationMessage('Tanlangan merchant, terminal, viloyat yoki tuman tasdiqlanmadi. Filtrni yangilang yoki tozalang.')
      return false
    }
    setDraft(lookups.reconciledDraft)
    setApplied(next)
    setValidationMessage(null)
    return true
  }

  function resetFilters() {
    setDraft({})
    setSearchDraft('')
    setApplied((current) => clearStaticTerminal(current))
    setValidationMessage(null)
  }

  if (!staticReadAllowed) return <NoAccessState description="Statik QR ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.auth.kind === 'unavailable') return <ErrorState title="Statik QR autentifikatsiyasi sozlanmagan" />
  if (!transport) return <ErrorState title="Statik QR integratsiyasi sozlanmagan" />

  return <div className="mx-auto min-w-0 max-w-7xl">
    <StaticQrDisplayDialog row={selectedQrRow} onOpenChange={(open) => {
      if (!open) setSelectedQrRow(null)
    }} />
    <StaticQrDetailsSheet row={selectedDetailsRow} onOpenChange={(open) => {
      if (!open) setSelectedDetailsRow(null)
    }} onViewQr={(row) => {
      setSelectedDetailsRow(null)
      setSelectedQrRow(row)
    }} />
    <StaticQrResults terminalConfirmed={selectedValid} pending={list.isPending}
      error={list.isError} data={list.data} page={applied.page}
      columnOrder={columnPreferences.order}
      visibleColumnIds={columnPreferences.visible}
      onRetry={() => void list.refetch()}
      onPageChange={(page) => setApplied((current) => ({ ...current, page }))}
      onViewQr={setSelectedQrRow}
      onViewDetails={setSelectedDetailsRow}
      quickFilters={<StaticQrQuickSearch searchDraft={searchDraft} onDraftChange={setSearchDraft}
        onApply={(search) => setApplied((current) => applyStaticQrQuickSearch(current, search))} />}
      headerActions={<div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <FilterDrawer
          onApply={applyFilters}
          onReset={resetFilters}
          triggerSize="sm"
        >
          <StaticQrAdvancedFilterFields draft={lookups.reconciledDraft} {...lookups.fields} onChange={setDraft}
            onReconcileDraft={() => { if (lookups.reconciledDraft !== draft) setDraft(lookups.reconciledDraft) }} />
          {validationMessage ? <p role="alert" className="text-sm text-destructive">{validationMessage}</p> : null}
        </FilterDrawer>
        <TableColumnPreferences
          tableLabel="Statik QR"
          items={staticQrColumns}
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
      </div>} />
  </div>
}
