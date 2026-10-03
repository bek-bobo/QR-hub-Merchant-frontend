import { useReducer, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DynamicQrDetailsSheet } from '@/features/dynamic-qr/DynamicQrDetailsSheet'
import { QrDisplayDialog } from '@/features/dynamic-qr/QrDisplayDialog'
import type {
  DashboardFilters,
  DynamicQrRow,
} from '@/shared/contracts/merchant-read'
import { getTashkentDatePreset, type DatePresetDays } from '@/shared/filters/date-range'
import { formatInstantTime } from '@/shared/presentation/date-time'
import { useTableColumnPreferences } from '@/shared/table-columns/useTableColumnPreferences'
import {
  ErrorState,
  NoAccessState,
} from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { TableColumnPreferences } from '@/shared/ui/TableColumnPreferences'
import { DashboardRecentQrTable } from './DashboardRecentQrTable'
import { dashboardRecentQrColumns, DASHBOARD_RECENT_QR_TABLE_KEY } from './recent-qr-columns'
import { DashboardPageHeader } from './DashboardPageHeader'
import { DashboardQuickDateFilter } from './DashboardQuickDateFilter'
import { DashboardTerminalFilter } from './DashboardTerminalFilter'
import { createDashboardFilterState, dashboardFilterReducer } from './filter-state'
import { MetricCards } from './MetricCards'
import { StatusDonut } from './StatusDonut'
import { resetDashboardFilters } from './presenters'
import { useDashboardReadQueries } from './queries'
import { TrendChart } from './TrendChart'

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Dashboard yuklanmoqda" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
    </div>
  )
}

interface RecentQrPanelProps {
  readonly query: ReturnType<typeof useDashboardReadQueries>['recent']
  readonly enabled: boolean
  readonly filters: DashboardFilters
  readonly dynamicQrPath: string
}

function RecentQrSkeleton() {
  return (
    <div role="status" className="min-w-0 space-y-3">
      <p className="text-sm text-text-secondary">So‘nggi dinamik QRlar yuklanmoqda…</p>
      <div aria-hidden="true" className="overflow-hidden rounded-lg border motion-safe:animate-pulse">
        <div className="h-10 border-b bg-muted/50" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="grid grid-cols-3 gap-4 border-b p-3 last:border-b-0">
            <div className="h-4 rounded bg-muted" />
            <div className="h-4 rounded bg-muted" />
            <div className="h-4 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecentQrPanel({
  query,
  enabled,
  filters,
  dynamicQrPath,
}: RecentQrPanelProps) {
  const columnPreferences = useTableColumnPreferences({
    tableKey: DASHBOARD_RECENT_QR_TABLE_KEY,
    columns: dashboardRecentQrColumns,
  })
  const [qrRow, setQrRow] = useState<DynamicQrRow | null>(null)
  const [detailsRow, setDetailsRow] = useState<DynamicQrRow | null>(null)

  if (!enabled) {
    return null
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3 border-b">
        <div className="min-w-0 flex-1 basis-64 space-y-1">
          <CardTitle>So‘nggi dinamik QRlar</CardTitle>
          <CardDescription>Tanlangan filtrlar bo‘yicha so‘nggi 10 ta dinamik QR.</CardDescription>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <TableColumnPreferences
            tableLabel="So‘nggi dinamik QRlar"
            items={dashboardRecentQrColumns}
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
          <Button asChild variant="outline" size="sm">
            <Link
              to={dynamicQrPath}
              state={{
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                ...(filters.terminalId
                  ? { terminalId: filters.terminalId }
                  : {}),
              }}
            >
              Barchasini ko‘rish
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        {query.data ? (
          <>
            {query.isFetching ? (
              <p className="mb-3 text-xs text-text-secondary">So‘nggi dinamik QRlar yangilanmoqda…</p>
            ) : null}
            <DashboardRecentQrTable rows={query.data.content}
              columnOrder={columnPreferences.order} visibleColumnIds={columnPreferences.visible}
              onViewQr={setQrRow} onViewDetails={setDetailsRow} />
            {query.isRefetchError && !query.isFetching ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                So‘nggi dinamik QRlar yangilanmadi. Avval yuklangan ma’lumotlar ko‘rsatilmoqda.
              </p>
            ) : null}
          </>
        ) : query.isPending ? (
          <RecentQrSkeleton />
        ) : query.isError ? (
          <ErrorState title="So‘nggi dinamik QRlarni yuklab bo‘lmadi"
            description="Birozdan so‘ng qayta urinib ko‘ring."
            onRetry={() => void query.refetch()} />
        ) : null}
      </CardContent>
      <DynamicQrDetailsSheet row={detailsRow}
        onOpenChange={(open) => { if (!open) setDetailsRow(null) }}
        onViewQr={(row) => { setDetailsRow(null); setQrRow(row) }} />
      <QrDisplayDialog row={qrRow} onOpenChange={(open) => { if (!open) setQrRow(null) }} />
    </Card>
  )
}

function formatUpdatedAt(value: number): string {
  return formatInstantTime(value)
}

interface DashboardReadPageProps {
  readonly initialInstant?: Date
  readonly dynamicQrPath?: string
}

export function DashboardReadPage({
  initialInstant,
  dynamicQrPath = '/dynamic-qrs',
}: DashboardReadPageProps = {}) {
  const [filters, dispatch] = useReducer(
    dashboardFilterReducer,
    initialInstant,
    (instant) => createDashboardFilterState(resetDashboardFilters(instant ?? new Date())),
  )
  const { applied, dateDraft, terminalDraft, validationMessage } = filters
  const queries = useDashboardReadQueries(applied)
  const { dashboard, terminals, recent, enabled, runtime } = queries
  const refreshing = dashboard.isFetching || (enabled.recent && recent.isFetching)

  function selectPreset(days: DatePresetDays) {
    dispatch({ type: 'date-draft', range: getTashkentDatePreset(days, initialInstant ?? new Date()) })
  }

  function clearFilters() {
    dispatch({ type: 'reset', filters: resetDashboardFilters(initialInstant ?? new Date()) })
  }

  async function refreshMountedQueries() {
    const requests: Promise<unknown>[] = []
    if (enabled.dashboard) {
      requests.push(dashboard.refetch())
    }
    if (enabled.recent) {
      requests.push(recent.refetch())
    }
    await Promise.all(requests)
  }

  if (runtime.readiness.dashboard.kind === 'unavailable') {
    return (
      <ErrorState
        title="Dashboard integratsiyasi sozlanmagan"
        description={runtime.readiness.dashboard.reason}
      />
    )
  }

  if (!runtime.capabilities.dashboard) {
    return <NoAccessState description="Dashboard ma’lumotlarini ko‘rish huquqi mavjud emas." />
  }

  return (
    <div className="min-w-0 space-y-6">
      <DashboardPageHeader
        updatedAt={
          dashboard.dataUpdatedAt > 0
            ? formatUpdatedAt(dashboard.dataUpdatedAt)
            : undefined
        }
        refreshDisabled={!enabled.dashboard || refreshing}
        refreshing={refreshing}
        onRefresh={() => void refreshMountedQueries()}
        quickFilters={<DashboardQuickDateFilter range={dateDraft} validationMessage={validationMessage}
          onDraftChange={(range) => dispatch({ type: 'date-draft', range })}
          onApply={() => dispatch({ type: 'apply-dates' })}
          onPreset={selectPreset} onReset={clearFilters} />}
      >
        <FilterDrawer
          description="O‘zgarishlar faqat “Qo‘llash” bosilganda yuboriladi."
          onApply={() => { dispatch({ type: 'apply-terminal' }); return true }}
          onReset={clearFilters}
          triggerSize="sm"
        >
          <DashboardTerminalFilter value={terminalDraft} options={terminals.data}
            enabled={enabled.terminals} pending={terminals.isPending} error={terminals.isError}
            onChange={(terminalId) => dispatch({ type: 'terminal-draft', terminalId })}
            onRetry={() => void terminals.refetch()} />
        </FilterDrawer>
      </DashboardPageHeader>

      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.isError && !dashboard.data ? (
        <ErrorState onRetry={() => void dashboard.refetch()} />
      ) : dashboard.data ? (
        <>
          {dashboard.isRefetchError ? (
            <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-background p-3 text-sm text-status-error-foreground">
              Yangilanmadi
            </p>
          ) : null}
          <MetricCards metrics={dashboard.data.metrics} />
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <TrendChart view={dashboard.data} />
            <StatusDonut pie={dashboard.data.pie} metrics={dashboard.data.metrics} />
          </div>
        </>
      ) : null}

      <RecentQrPanel
        query={recent}
        enabled={enabled.recent}
        filters={applied}
        dynamicQrPath={dynamicQrPath}
      />
    </div>
  )
}
