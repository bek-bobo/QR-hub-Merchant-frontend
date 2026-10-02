import { useState } from 'react'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { can } from '@/shared/auth/access'
import { HandCoinsIcon, WalletCardsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RefreshIconButton } from '@/components/RefreshIconButton'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { dynamicQrColumns } from './columns'
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
  return (
    <div
      role="status"
      aria-label="Dinamik QR ro‘yxati yuklanmoqda"
      className="space-y-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

export function DynamicQrPage({
  initialState,
  initialInstant,
}: DynamicQrPageProps) {
  const access = useAccessContext()
  const [initialFilters] = useState(() =>
    initialFiltersFromState(initialState, initialInstant ?? new Date()),
  )
  const [advancedDraft, setAdvancedDraft] = useState<DynamicQrAdvancedFilterDraft>(() => advancedDraftFromFilters(initialFilters))
  const [filterMessage, setFilterMessage] = useState<string | null>(null)
  const [dateDraft, setDateDraft] = useState(() => ({
    fromDate: initialFilters.fromDate,
    toDate: initialFilters.toDate,
  }))
  const [searchDraft, setSearchDraft] = useState(initialFilters.search)
  const [applied, setApplied] = useState<DynamicQrFilters>(initialFilters)
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
      setFilterMessage('Tanlangan filtrlarni tasdiqlab bo‘lmadi.')
      return false
    }
  }

  function clearFilters() {
    const next = createDefaultDynamicQrFilters(initialInstant ?? new Date())
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
    const defaults = createDefaultDynamicQrFilters(initialInstant ?? new Date())
    const range = { fromDate: defaults.fromDate, toDate: defaults.toDate }
    setDateDraft(range)
    setApplied((current) => applyDynamicQrDateQuickFilter(current, range) ?? current)
  }

  function applyQuickSearch(search: string) {
    setSearchDraft(search.trim())
    setApplied((current) => applyDynamicQrSearchQuickFilter(current, search))
  }

  function goToPage(page: number) {
    setApplied((current) => changeDynamicQrPage(current, page))
  }

  function renderFilterDrawer() {
    return (
      <FilterDrawer
        onApply={applyFilters}
        onReset={clearFilters}
        triggerSize="sm"
      >
        <DynamicQrAdvancedFilterFields {...advancedFilterFieldProps(lookups, advancedDraft, setAdvancedDraft)} />
        {lookups.merchants.isError || lookups.draftBanks.isError || lookups.draftTerminals.isError
          ? <Button type="button" variant="outline" size="sm" onClick={lookups.retryDraftLookups}>Qayta urinish</Button> : null}
        {filterMessage ? <p role="alert" className="text-sm text-destructive">{filterMessage}</p> : null}
      </FilterDrawer>
    )
  }

  function renderQuickFilters() {
    return (
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <DynamicQrQuickFilters
          range={dateDraft}
          searchDraft={searchDraft}
          onRangeDraftChange={setDateDraft}
          onRangeApply={applyQuickDateRange}
          onRangeReset={restoreQuickDateRange}
          onSearchDraftChange={setSearchDraft}
          onSearchApply={applyQuickSearch}
        />
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <ExportButton applied={applied} terminalValid={filterState === 'valid'} compact />
          {renderFilterDrawer()}
        </div>
      </div>
    )
  }

  function renderTableHeaderActions() {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        {can(access, 'dynamicQr.create', false) ? (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>Yangi QR yaratish</Button>
        ) : null}
        <div className="flex min-w-0 items-center gap-2">
          <TableColumnPreferences
            tableLabel="Dinamik QR"
            items={dynamicQrColumns}
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
        title="Dinamik QR integratsiyasi sozlanmagan"
        description={runtime.readiness.dynamicQr.reason}
      />
    )
  }

  if (!runtime.capabilities.dynamicQr) {
    return (
      <NoAccessState description="Dinamik QR ro‘yxatini ko‘rish huquqi mavjud emas." />
    )
  }

  const emptyHighPage = Boolean(
    list.data && list.data.page > 0 && list.data.content.length === 0,
  )

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
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <p className="text-xs text-text-secondary sm:col-span-2">Jami summa va xizmat haqi sana oralig‘i va terminal bo‘yicha.</p>
          <section className="min-w-0 rounded-xl border border-brand/15 bg-brand-soft/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-text-secondary">Jami summa</p>
              <span className="rounded-lg bg-surface/80 p-2 text-brand">
                <WalletCardsIcon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">
                {enabled.stats && stats.data ? formatMoney(stats.data.totalAmount) : '—'}
            </p>
          </section>
          <section className="min-w-0 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-text-secondary">Xizmat haqi</p>
              <span className="rounded-lg bg-surface p-2 text-text-secondary">
                <HandCoinsIcon className="size-4" aria-hidden="true" />
              </span>
            </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">
                  {enabled.stats && stats.data
                      ? formatMoney(stats.data.totalServiceFeeAmount)
                      : '—'}
              </p>
          </section>
          {!statsFeatureEnabled ? (
            <p role="status" className="text-xs text-text-secondary sm:col-span-2">
              Statistika hozircha mavjud emas
            </p>
          ) : null}
          {enabled.stats && stats.isError ? (
            <p role="status" className="text-xs text-text-secondary sm:col-span-2">
              Jami summa va xizmat haqini yuklab bo‘lmadi.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {filterState === 'checking' ? (
        <Card className="min-w-0">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Dinamik QR ro‘yxati</CardTitle>
            {renderTableHeaderActions()}
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-secondary">
            {renderQuickFilters()}
            <p>Tanlangan filtrlar tekshirilmoqda.</p>
          </CardContent>
        </Card>
      ) : filterState === 'invalid' ? (
        <Card className="min-w-0">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Dinamik QR ro‘yxati</CardTitle>
            {renderTableHeaderActions()}
          </CardHeader>
          <CardContent className="space-y-3">
            {renderQuickFilters()}
            <div>
              <p className="font-medium text-text-primary">
                Tanlangan filtr endi mavjud emas
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Xavfsizlik sababli so‘rov barcha terminallarga avtomatik kengaytirilmadi.
              </p>
            </div>
            <Button type="button" onClick={clearFilters}>Filtrni tozalash</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="min-w-0" aria-busy={list.isFetching}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Dinamik QR ro‘yxati</CardTitle>
            {renderTableHeaderActions()}
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            {renderQuickFilters()}
            {list.isPending ? (
              <ListSkeleton />
            ) : list.isError && !list.data ? (
              <ErrorState onRetry={() => void list.refetch()} />
            ) : emptyHighPage ? (
              <EmptyState
                title="Bu sahifada ma’lumot qolmadi"
                description="Natijalar o‘zgargan bo‘lishi mumkin. Birinchi sahifaga qayting."
              />
            ) : list.data && list.data.content.length === 0 ? (
              <EmptyState description="Qo‘llangan filtrlar bo‘yicha ma’lumot topilmadi." />
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
                Birinchi sahifaga qaytish
              </Button>
            ) : null}
            {list.isRefetchError && list.data ? (
              <p role="alert" className="text-sm text-destructive">Yangilanmadi</p>
            ) : null}
            {list.data ? (
              <PaginationBar ariaLabel="Dinamik QR sahifalari"
                currentPage={list.data.page} totalPages={list.data.totalPages}
                totalItems={list.data.totalElements} showTotal={false}
                onPageChange={goToPage} />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

