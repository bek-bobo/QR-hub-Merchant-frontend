import { useDynamicQrPresentation } from './presentation'
import { useDebouncedSearch } from '@/shared/filters/debounced-search'
import { useState } from 'react'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { can } from '@/shared/auth/access'
import { CreditCardIcon, InfoIcon, PercentIcon, PlusIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RefreshIconButton } from '@/components/RefreshIconButton'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import type {
  DynamicQrFilters,
  DynamicQrRow,
} from '@/shared/contracts/merchant-read'
import {
  EmptyState,
  ErrorState,
  NoAccessState,
} from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { TableColumnPreferences } from '@/shared/ui/TableColumnPreferences'
import { useTableColumnPreferences } from '@/shared/table-columns/useTableColumnPreferences'
import { DynamicQrAdvancedFilterFields } from './DynamicQrAdvancedFilterFields'
import { DynamicQrQuickFilters } from './DynamicQrQuickFilters'
import { DynamicQrTable } from './DynamicQrTable'
import { createDynamicQrColumns } from './columns'
import { ExportButton } from './ExportButton'
import { CreateQrDialog } from './CreateQrDialog'
import { QrDisplayDialog } from './QrDisplayDialog'
import { DynamicQrDetailsSheet } from './DynamicQrDetailsSheet'
import {
  changeDynamicQrPage,
  createDefaultDynamicQrFilters,
  parseDashboardDynamicQrState,
} from './page-state'
import { useDynamicQrReadQueries } from './queries'
import { advancedFilterFieldProps } from './filter-lookups'
import { formatInstantTime } from '@/shared/presentation/date-time'
import {
  applyDynamicQrAdvancedFilters,
  applyDynamicQrDateQuickFilter,
  applyDynamicQrSearchQuickFilter,
  advancedDraftFromFilters,
  type DynamicQrAdvancedFilterDraft,
} from './quick-filters'
import { formatMoney } from '@/shared/money/minor'

interface DynamicQrPageProps {
  readonly initialState?: unknown
  readonly initialInstant?: Date
}

const listCardClassName = 'dynamic-qr-list min-w-0 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(4.5)] sm:[--card-spacing:--spacing(6)]'

function initialFiltersFromState(
  initialState: unknown,
  instant = new Date(),
): DynamicQrFilters {
  const defaults = createDefaultDynamicQrFilters(instant)
  const dashboardState = parseDashboardDynamicQrState(initialState)
  return dashboardState
    ? Object.freeze({ ...defaults, ...dashboardState })
    : defaults
}

function ListSkeleton() {
  const p = useDynamicQrPresentation()
  return (
    <div
      role="status"
      aria-label={p.message('page.loading')}
      className="space-y-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone,
  helper,
}: {
  readonly title: string
  readonly value: string
  readonly icon: LucideIcon
  readonly tone: 'brand' | 'neutral'
  readonly helper: string | null
}) {
  return (
    <section
      aria-label={title}
      className={`relative min-w-0 overflow-hidden rounded-xl border p-5 ${
        tone === 'brand'
          ? 'border-brand/20 bg-linear-to-br from-surface/70 to-brand-soft'
          : 'border-border bg-linear-to-br from-surface to-muted/40'
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 180 140"
        preserveAspectRatio="none"
        className={`pointer-events-none absolute inset-y-0 right-0 h-full w-2/5 ${tone === 'brand' ? 'text-brand/3' : 'text-text-secondary/3'}`}
      >
        <path fill="currentColor" d="M180 0C90 0 130 85 40 140H180Z" />
        <path fill="currentColor" d="M180 55C115 50 70 105 0 140H180Z" />
      </svg>
      <div className="relative flex items-start gap-4">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
          tone === 'brand' ? 'bg-brand/7 text-brand' : 'bg-muted text-text-primary'
        }`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="mt-0.5 text-sm font-semibold text-text-primary">{title}</h2>
          <p className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-text-primary [overflow-wrap:anywhere] sm:text-3xl">
            {value}
          </p>
          {helper ? (
            <p role="status" className="mt-2.5 flex items-start gap-2 text-xs leading-5 text-text-secondary">
              <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{helper}</span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function DynamicQrPage({
  initialState,
  initialInstant,
}: DynamicQrPageProps) {
  const p = useDynamicQrPresentation()
  const dynamicQrColumns = createDynamicQrColumns(p)
  const access = useAccessContext()
  const [initialFilters] = useState(() =>
    initialFiltersFromState(initialState, initialInstant ?? new Date()),
  )
  const [advancedDraft, setAdvancedDraft] = useState<DynamicQrAdvancedFilterDraft>(() => advancedDraftFromFilters(initialFilters))
  const [filterMessage, setFilterMessage] = useState<'invalid' | null>(null)
  const [dateDraft, setDateDraft] = useState(() => ({
    fromDate: initialFilters.fromDate,
    toDate: initialFilters.toDate,
  }))
  const [searchDraft, setSearchDraft] = useState(initialFilters.search)
  const [applied, setApplied] = useState<DynamicQrFilters>(initialFilters)
  useDebouncedSearch(searchDraft, applied.search, (search) => {
    setApplied((current) => applyDynamicQrSearchQuickFilter(current, search))
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedQrRow, setSelectedQrRow] = useState<DynamicQrRow | null>(null)
  const [selectedDetailsRow, setSelectedDetailsRow] = useState<DynamicQrRow | null>(null)
  const queries = useDynamicQrReadQueries(applied, advancedDraft)
  const { runtime, list, stats, statsFeatureEnabled, filterState, enabled, lookups } = queries
  const columnPreferences = useTableColumnPreferences({
    tableKey: 'dynamicQr',
    columns: dynamicQrColumns,
  })

  function applyFilters(): boolean {
    try {
      const next = applyDynamicQrAdvancedFilters(applied, advancedDraft, lookups.draftEvidence)
      setAdvancedDraft(advancedDraftFromFilters(next))
      setApplied(next)
      setFilterMessage(null)
      return true
    } catch {
      setFilterMessage('invalid')
      return false
    }
  }

  function resetDrawerDraft() {
    setAdvancedDraft(advancedDraftFromFilters({}))
    setFilterMessage(null)
  }

  function syncDrawerDraft(open: boolean) {
    setAdvancedDraft(advancedDraftFromFilters(open ? applied : {}))
    setFilterMessage(null)
  }

  function clearFilters() {
    const next = createDefaultDynamicQrFilters()
    setAdvancedDraft(advancedDraftFromFilters(next))
    setFilterMessage(null)
    setDateDraft({ fromDate: next.fromDate, toDate: next.toDate })
    setSearchDraft(next.search)
    setApplied(next)
  }

  function applyQuickDateRange(range: Pick<DynamicQrFilters, 'fromDate' | 'toDate'>) {
    setDateDraft(range)
    setApplied((current) => applyDynamicQrDateQuickFilter(current, range) ?? current)
  }

  function restoreQuickDateRange() {
    const defaults = createDefaultDynamicQrFilters()
    const range = { fromDate: defaults.fromDate, toDate: defaults.toDate }
    setDateDraft(range)
    setApplied((current) => applyDynamicQrDateQuickFilter(current, range) ?? current)
  }


  function goToPage(page: number) {
    setApplied((current) => changeDynamicQrPage(current, page))
  }

  function renderFilterDrawer() {
    return (
      <FilterDrawer
        onApply={applyFilters}
        onReset={resetDrawerDraft}
        onOpenChange={syncDrawerDraft}
        triggerSize="sm"
        triggerClassName="h-10 gap-2 rounded-xl bg-muted/30 px-4 text-sm"
      >
        <DynamicQrAdvancedFilterFields {...advancedFilterFieldProps(lookups, advancedDraft, setAdvancedDraft)} />
        {lookups.merchants.isError || lookups.draftBanks.isError || lookups.draftTerminals.isError
          ? <Button type="button" variant="outline" size="sm" onClick={lookups.retryDraftLookups}>{p.common('actions.retry')}</Button> : null}
        {filterMessage ? <p role="alert" className="text-sm text-destructive">{p.message('filters.invalid')}</p> : null}
      </FilterDrawer>
    )
  }

  function renderQuickFilters() {
    return (
      <div className="dynamic-qr-toolbar flex min-w-0 flex-wrap items-center gap-2">
        <DynamicQrQuickFilters
          range={dateDraft}
          searchDraft={searchDraft}
          searchPlaceholder={p.message('filters.search')}
          onRangeDraftChange={setDateDraft}
          onRangeApply={applyQuickDateRange}
          onRangeReset={restoreQuickDateRange}
          onSearchDraftChange={setSearchDraft}
        />
        <ExportButton applied={applied} terminalValid={filterState === 'valid'} compact showIcon
          className="h-10 gap-2 rounded-xl bg-muted/30 px-4 text-sm" />
        {renderFilterDrawer()}
        {renderTableHeaderActions()}
      </div>
    )
  }

  function renderTableHeaderActions() {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        {can(access, 'dynamicQr.create', false) ? (
          <Button type="button" size="sm" className="h-10 gap-2 rounded-xl px-4 text-sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" aria-hidden="true" />
            {p.message('actions.new')}</Button>
        ) : null}
        <div className="flex min-w-0 items-center gap-2">
          <TableColumnPreferences
            tableLabel={p.message('page.name')}
            items={dynamicQrColumns}
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
            updatedTime={list.dataUpdatedAt > 0 ? formatInstantTime(list.dataUpdatedAt, {locale: p.intlLocale, timeZone: 'Asia/Tashkent'}) : '—'}
            disabled={!enabled.list || list.isFetching}
            loading={list.isFetching}
            onClick={() => {
              void list.refetch()
              if (enabled.stats) void stats.refetch()
            }}
          />
        </div>
      </div>
    )
  }

  if (runtime.readiness.dynamicQr.kind === 'unavailable') {
    return (
      <ErrorState
        title={p.message('page.integration')}
        description={p.common('states.unavailable')}
      />
    )
  }

  if (!runtime.capabilities.dynamicQr) {
    return (
      <NoAccessState description={p.message('page.noAccess')} />
    )
  }

  const emptyHighPage = Boolean(
    list.data && list.data.page > 0 && list.data.content.length === 0,
  )
  const statsHelper = !statsFeatureEnabled
    ? p.message('stats.unavailable')
    : enabled.stats && stats.isError
      ? p.message('stats.failed')
      : null

  return (
    <div className="min-w-0 space-y-4">
      <CreateQrDialog open={createOpen} onOpenChange={setCreateOpen} />
      <QrDisplayDialog row={selectedQrRow} onOpenChange={(open) => {
        if (!open) setSelectedQrRow(null)
      }} />
      <DynamicQrDetailsSheet row={selectedDetailsRow} onOpenChange={(open) => {
        if (!open) setSelectedDetailsRow(null)
      }} onViewQr={(row) => {
        setSelectedDetailsRow(null)
        setSelectedQrRow(row)
      }} />
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <SummaryCard
          title={p.message('stats.total')}
          icon={CreditCardIcon}
          tone="brand"
          value={enabled.stats && stats.data ? formatMoney(stats.data.totalAmount) : '—'}
          helper={statsHelper}
        />
        <SummaryCard
          title={p.message('stats.fee')}
          icon={PercentIcon}
          tone="neutral"
          value={enabled.stats && stats.data ? formatMoney(stats.data.totalServiceFeeAmount) : '—'}
          helper={statsHelper}
        />
      </div>

      {filterState === 'checking' ? (
        <Card className={listCardClassName}>
          <CardContent className="space-y-4 text-sm text-text-secondary">
            {renderQuickFilters()}
            <p>{p.message('filters.checking')}</p>
          </CardContent>
        </Card>
      ) : filterState === 'invalid' ? (
        <Card className={listCardClassName}>
          <CardContent className="space-y-3">
            {renderQuickFilters()}
            <div>
              <p className="font-medium text-text-primary">
                {p.message('filters.unavailable')}</p>
              <p className="mt-1 text-sm text-text-secondary">
                {p.message('filters.noExpansion')}</p>
            </div>
            <Button type="button" onClick={clearFilters}>{p.message('filters.clear')}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className={listCardClassName} aria-busy={list.isFetching}>
          <CardContent className="min-w-0 space-y-4.5">
            {renderQuickFilters()}
            {list.isPending ? (
              <ListSkeleton />
            ) : list.isError && !list.data ? (
              <ErrorState onRetry={() => void list.refetch()} />
            ) : emptyHighPage ? (
              <EmptyState
                title={p.message('page.emptyHigh')}
                description={p.message('page.firstHelp')}
              />
            ) : list.data && list.data.content.length === 0 ? (
              <EmptyState description={p.message('page.empty')} />
            ) : list.data ? (
              <DynamicQrTable
                rows={list.data.content}
                columnOrder={columnPreferences.order}
                visibleColumnIds={columnPreferences.visible}
                onViewQr={setSelectedQrRow}
                onViewDetails={setSelectedDetailsRow}
              />
            ) : null}

            {emptyHighPage ? (
              <Button type="button" onClick={() => goToPage(0)}>
                {p.message('page.first')}</Button>
            ) : null}
            {list.isRefetchError && list.data ? (
              <p role="alert" className="text-sm text-destructive">{p.message('page.stale')}</p>
            ) : null}
            {list.data ? (
              <PaginationBar ariaLabel={p.message('page.pages')}
                currentPage={list.data.page} totalPages={list.data.totalPages}
                totalItems={list.data.totalElements}
                totalLabel={p.message('page.total', {countText: p.number(list.data.totalElements)})}
                className="dynamic-qr-pagination border-0 pt-2"
                onPageChange={goToPage} pageSize={list.data.size}
                onPageSizeChange={(size) => setApplied((current) => ({ ...current, size, page: 0 }))} />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

