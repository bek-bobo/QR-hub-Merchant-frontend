import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
import { MetricCards } from './MetricCards'
import { StatusDonut } from './StatusDonut'
import {
  applyDashboardFilters,
  resetDashboardFilters,
} from './presenters'
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
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <CardTitle>So‘nggi dinamik QRlar</CardTitle>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
      <CardContent>
        {query.isPending ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted" role="status" />
        ) : query.isError && !query.data ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : query.data ? (
          <DashboardRecentQrTable rows={query.data.content}
            columnOrder={columnPreferences.order} visibleColumnIds={columnPreferences.visible}
            onViewQr={setQrRow} onViewDetails={setDetailsRow} />
        ) : null}
        {query.isRefetchError && query.data ? (
          <p role="alert" className="mt-3 text-sm text-destructive">Yangilanmadi</p>
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
  const [initialFilters] = useState(() =>
    resetDashboardFilters(initialInstant ?? new Date()),
  )
  const [draft, setDraft] = useState<DashboardFilters>(initialFilters)
  const [applied, setApplied] = useState<DashboardFilters>(initialFilters)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const queries = useDashboardReadQueries(applied)
  const { dashboard, terminals, recent, enabled, runtime } = queries
  const refreshing = dashboard.isFetching || (enabled.recent && recent.isFetching)

  function selectPreset(days: DatePresetDays) {
    setDraft((current) => ({
      ...current,
      ...getTashkentDatePreset(days, initialInstant ?? new Date()),
    }))
    setValidationMessage(null)
  }

  function applyFilters(): boolean {
    try {
      const next = applyDashboardFilters(draft)
      setApplied(next)
      setDraft(next)
      setValidationMessage(null)
      return true
    } catch {
      setValidationMessage('Sana oralig‘ini to‘g‘ri kiriting.')
      return false
    }
  }

  function clearFilters() {
    const next = resetDashboardFilters(initialInstant ?? new Date())
    setDraft(next)
    setApplied(next)
    setValidationMessage(null)
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
      >
        <FilterDrawer
        description="O‘zgarishlar faqat “Qo‘llash” bosilganda yuboriladi."
        onApply={applyFilters}
        onReset={clearFilters}
        triggerSize="sm"
      >
          <div className="flex flex-wrap gap-2" aria-label="Davr presetlari">
            {([1, 7, 30] as const).map((days) => (
              <Button key={days} type="button" variant="outline" size="sm" onClick={() => selectPreset(days)}>
                {days} kun
              </Button>
            ))}
          </div>
          <div className="grid gap-4">
            <label className="block space-y-1.5 text-sm font-medium text-text-primary">
              Boshlanish sanasi
              <Input
                type="date"
                value={draft.fromDate}
                aria-invalid={Boolean(validationMessage)}
                onChange={(event) => setDraft({ ...draft, fromDate: event.target.value })}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-text-primary">
              Tugash sanasi
              <Input
                type="date"
                value={draft.toDate}
                aria-invalid={Boolean(validationMessage)}
                onChange={(event) => setDraft({ ...draft, toDate: event.target.value })}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-text-primary">
              Terminal
              <Select
                value={draft.terminalId ?? ''}
                disabled={!enabled.terminals || terminals.isPending}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    terminalId: event.target.value || undefined,
                  })
                }
              >
                <option value="">Barcha terminallar</option>
                {terminals.data?.map((terminal) => (
                  <option key={terminal.id} value={terminal.id}>{terminal.name}</option>
                ))}
              </Select>
            </label>
          </div>
          {validationMessage ? (
            <p role="alert" className="text-sm text-destructive">{validationMessage}</p>
          ) : null}
          {!enabled.terminals ? (
            <p className="text-sm text-text-secondary">
              Terminal filtri mavjud emas; dashboard barcha biriktirilgan terminallar bo‘yicha ishlaydi.
            </p>
          ) : terminals.isError ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-destructive">
              Terminal ro‘yxatini yuklab bo‘lmadi.
              <Button type="button" variant="outline" size="sm" onClick={() => void terminals.refetch()}>
                Qayta urinish
              </Button>
            </div>
          ) : null}
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
          <div className="min-w-0 space-y-6">
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
