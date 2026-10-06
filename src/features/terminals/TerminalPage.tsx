import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshIconButton } from '@/components/RefreshIconButton'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { formatInstantTime } from '@/shared/presentation/date-time'
import { useTableColumnPreferences } from '@/shared/table-columns/useTableColumnPreferences'
import { TableColumnPreferences } from '@/shared/ui/TableColumnPreferences'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { changeManagementPage, type TerminalListFilters } from '@/shared/contracts/management-filters'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { applyTerminalAdvancedDraft, applyTerminalQuickSearch, createDefaultTerminalFilters, resetTerminalFilters, type TerminalAdvancedDraft } from './page-state'
import { TerminalAdvancedFilterFields, TerminalQuickSearch } from './TerminalFilterControls'
import { useTerminalFilterLookups } from './filter-lookups'
import { terminalColumns } from './columns'
import { TerminalResults } from './TerminalResults'
import { TerminalQrDialog } from './TerminalQrDialog'
import { TerminalDetailsSheet } from './TerminalDetailsSheet'

export function TerminalPage() {
  const runtime = useReadRuntime()
  const [qrRow, setQrRow] = useState<TerminalRow | null>(null)
  const [detailsRow, setDetailsRow] = useState<TerminalRow | null>(null)
  const [draft, setDraft] = useState<TerminalAdvancedDraft>({})
  const [searchDraft, setSearchDraft] = useState('')
  const [applied, setApplied] = useState<TerminalListFilters>(createDefaultTerminalFilters)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const columnPreferences = useTableColumnPreferences({
    tableKey: 'terminals',
    columns: terminalColumns,
  })

  const lookups = useTerminalFilterLookups(draft, applied)
  const listBase = runtime.queries.terminalListOptions(applied, lookups.bankGate, lookups.geographyGate)
  const listOptions = {
    ...listBase,
    queryKey: lookups.appliedReady ? listBase.queryKey : [...listBase.queryKey, 'selection-unconfirmed'],
    enabled: listBase.enabled && lookups.appliedReady,
  }
  const list = useQuery(listOptions)
  const blocked = !lookups.appliedReady

  function applyFilters(): boolean {
    try {
      const next = applyTerminalAdvancedDraft(applied, lookups.reconciledDraft, lookups.validation)
      setDraft(lookups.reconciledDraft)
      setApplied(next)
      setValidationMessage(null)
      return true
    } catch {
      setValidationMessage('Tanlangan merchant, bank hisobi, viloyat yoki tuman tasdiqlanmadi. Filtrni yangilang yoki tozalang.')
      return false
    }
  }

  function resetFilters() {
    const next = resetTerminalFilters(applied)
    setDraft({})
    setSearchDraft('')
    setApplied(next)
    setValidationMessage(null)
  }

  if (!runtime.capabilities.terminalList) return <NoAccessState description="Terminal ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.terminalList.kind === 'unavailable') return <ErrorState title="Terminal integratsiyasi sozlanmagan" />

  return <div className="mx-auto min-w-0 max-w-[96rem]">
    <TerminalResults blocked={blocked} pending={list.isPending} error={list.isError} data={list.data}
      columnOrder={columnPreferences.order}
      visibleColumnIds={columnPreferences.visible}
      onViewQr={setQrRow}
      onViewDetails={setDetailsRow}
      onRetry={() => void list.refetch()}
      onPageChange={(page) => setApplied((current) => changeManagementPage(current, page))}
      onPageSizeChange={(size) => setApplied((current) => ({ ...current, size, page: 0 }))}
      quickFilters={<TerminalQuickSearch searchDraft={searchDraft} onDraftChange={setSearchDraft}
        onApply={(search) => setApplied((current) => applyTerminalQuickSearch(current, search))} />}
      headerActions={<div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <FilterDrawer onApply={applyFilters} onReset={resetFilters} triggerSize="sm" triggerClassName="h-10 gap-2 rounded-xl bg-muted/30 px-4 text-sm">
          <TerminalAdvancedFilterFields draft={lookups.reconciledDraft} {...lookups.fields} onChange={setDraft}
            onReconcileDraft={() => { if (lookups.reconciledDraft !== draft) setDraft(lookups.reconciledDraft) }} />
          {validationMessage ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{validationMessage}</p> : null}
        </FilterDrawer>
        <TableColumnPreferences
          tableLabel="Terminallar"
          items={terminalColumns}
          order={columnPreferences.order}
          hidden={columnPreferences.hidden}
          iconOnly
          triggerClassName="size-10 rounded-xl bg-muted/30"
          onMoveUp={columnPreferences.moveUp}
          onMoveDown={columnPreferences.moveDown}
          onMove={columnPreferences.move}
          onToggleVisibility={columnPreferences.toggleVisibility}
          canHide={columnPreferences.canHide}
          onReset={columnPreferences.reset}
        />
        <RefreshIconButton
          className="size-10 rounded-xl bg-muted/30"
          updatedTime={list.dataUpdatedAt > 0 ? formatInstantTime(list.dataUpdatedAt) : '—'}
          disabled={!listOptions.enabled || list.isFetching}
          loading={list.isFetching}
          onClick={() => void list.refetch()}
        />
      </div>} />
    <TerminalQrDialog row={qrRow} onOpenChange={(open) => { if (!open) setQrRow(null) }} />
    <TerminalDetailsSheet row={detailsRow} onOpenChange={(open) => { if (!open) setDetailsRow(null) }}
      onViewQr={(row) => { setDetailsRow(null); setQrRow(row) }} />
  </div>
}
