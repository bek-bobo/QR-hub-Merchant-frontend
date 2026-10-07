import { useDebouncedSearch } from '@/shared/filters/debounced-search'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createDefaultDynamicQrFilters } from './page-state'
import { applyExportDraft } from './export-page-state'
import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ExportButton } from './ExportButton'
import { DynamicQrAdvancedFilterFields, type DynamicQrAdvancedFilterFieldsProps } from './DynamicQrAdvancedFilterFields'
import { DynamicQrQuickFilters } from './DynamicQrQuickFilters'
import { advancedFilterFieldProps, useDynamicQrFilterLookups } from './filter-lookups'
import { advancedDraftFromFilters, applyDynamicQrDateQuickFilter, applyDynamicQrSearchQuickFilter,
  type DynamicQrAdvancedFilterDraft } from './quick-filters'

export function ExportQrFilters(props: DynamicQrAdvancedFilterFieldsProps) {
  return <DynamicQrAdvancedFilterFields {...props} />
}

export function ExportQrPage() {
  const [initial] = useState(() => createDefaultDynamicQrFilters())
  const [advancedDraft, setAdvancedDraft] = useState<DynamicQrAdvancedFilterDraft>(() => advancedDraftFromFilters(initial))
  const [dateDraft, setDateDraft] = useState(() => ({ fromDate: initial.fromDate, toDate: initial.toDate }))
  const [searchDraft, setSearchDraft] = useState(initial.search)
  const [applied, setApplied] = useState<DynamicQrFilters>(initial)
  useDebouncedSearch(searchDraft, applied.search, (search) => {
    setApplied((current) => applyDynamicQrSearchQuickFilter(current, search))
  })
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const lookups = useDynamicQrFilterLookups(advancedDraft, applied)

  function apply(): boolean {
    const terminalEvidence = lookups.draftEvidence.terminals
    const result = applyExportDraft({ ...applied, ...advancedDraft }, {
      lookupEnabled: terminalEvidence.enabled, lookupPending: terminalEvidence.pending,
      lookupError: terminalEvidence.error, terminals: lookups.draftTerminals.data,
    }, lookups.draftEvidence)
    if (result.kind !== 'applied') {
      setMessage('Tanlangan filtrlarni tasdiqlab bo‘lmadi.')
      return false
    }
    setAdvancedDraft(advancedDraftFromFilters(result.filters))
    setApplied(result.filters)
    setRevision((current) => current + 1)
    setMessage(null)
    return true
  }

  function resetDrawerDraft() {
    setAdvancedDraft(advancedDraftFromFilters({}))
    setMessage(null)
  }

  function syncDrawerDraft(open: boolean) {
    setAdvancedDraft(advancedDraftFromFilters(open ? applied : {}))
    setMessage(null)
  }

  function applyDate(range: Pick<DynamicQrFilters, 'fromDate' | 'toDate'>) {
    setDateDraft(range)
    setApplied((current) => applyDynamicQrDateQuickFilter(current, range) ?? current)
  }

  function restoreQuickDateRange() {
    const { fromDate, toDate } = createDefaultDynamicQrFilters()
    applyDate({ fromDate, toDate })
  }


  return <div className="mx-auto min-w-0 max-w-7xl space-y-4">
    <PageHeader title="Dinamik QR XLSX eksporti" />
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <DynamicQrQuickFilters range={dateDraft} searchDraft={searchDraft}
        onRangeDraftChange={setDateDraft} onRangeApply={applyDate}
        onRangeReset={restoreQuickDateRange}
        onSearchDraftChange={setSearchDraft} />
      <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
        <ExportButton applied={applied} terminalValid={lookups.appliedFilterState === 'valid'} intentRevision={revision} compact />
        <FilterDrawer onApply={apply} onReset={resetDrawerDraft} onOpenChange={syncDrawerDraft} triggerSize="sm">
          <ExportQrFilters {...advancedFilterFieldProps(lookups, advancedDraft, setAdvancedDraft)} />
          {lookups.merchants.isError || lookups.draftBanks.isError || lookups.draftTerminals.isError
            ? <Button type="button" variant="outline" size="sm" onClick={lookups.retryDraftLookups}>Qayta urinish</Button> : null}
          {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
        </FilterDrawer>
      </div>
    </div>
    {lookups.appliedFilterState === 'invalid' ? <p role="alert" className="text-sm text-destructive">Tanlangan filtrni tekshiring yoki tozalang.</p> : null}
  </div>
}
