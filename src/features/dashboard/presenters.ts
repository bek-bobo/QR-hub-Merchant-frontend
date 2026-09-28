import { safeContractError } from '@/shared/api/errors'
import type {
  DashboardFilters,
  DashboardView,
  Money,
} from '@/shared/contracts/merchant-read'
import {
  getTashkentDatePreset,
  isValidDateRange,
} from '@/shared/filters/date-range'
import type { StatusTone } from '@/shared/presentation/status-tone'

export function applyDashboardFilters(
  draft: DashboardFilters,
): DashboardFilters {
  if (!isValidDateRange(draft)) {
    throw safeContractError()
  }

  const terminalId = draft.terminalId?.trim()
  return Object.freeze({
    fromDate: draft.fromDate,
    toDate: draft.toDate,
    ...(terminalId ? { terminalId } : {}),
  })
}

export function resetDashboardFilters(instant = new Date()): DashboardFilters {
  return getTashkentDatePreset(7, instant)
}

export function formatGrowth(value: number | null): string {
  if (value === null) {
    return '—'
  }

  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toLocaleString('uz-UZ', {
    maximumFractionDigits: 2,
  })}%`
}

export function reconcileDashboard(view: Pick<DashboardView, 'metrics'> & Partial<Pick<DashboardView, 'pie'>>) {
  const { total, success, processing, failed } = view.metrics
  const categorizedCount = BigInt(success.count) + BigInt(processing.count) + BigInt(failed.count)
  const categorizedAmount = BigInt(success.amount.minorUnits) +
    BigInt(processing.amount.minorUnits) + BigInt(failed.amount.minorUnits)
  return Object.freeze({
    countMatches: categorizedCount === BigInt(total.count) &&
      (!view.pie || (view.pie.success.count === success.count &&
        view.pie.processing.count === processing.count && view.pie.failed.count === failed.count)),
    amountMatches: categorizedAmount === BigInt(total.amount.minorUnits) &&
      (!view.pie || (view.pie.success.amount.minorUnits === success.amount.minorUnits &&
        view.pie.processing.amount.minorUnits === processing.amount.minorUnits &&
        view.pie.failed.amount.minorUnits === failed.amount.minorUnits)),
  })
}

export interface QrStatusPresentation {
  readonly label: string
  readonly tone: StatusTone
}

export function presentQrStatus(statusCode: number): QrStatusPresentation {
  switch (statusCode) {
    case 0:
      return { label: 'Yangi', tone: 'info' }
    case 5:
      return { label: 'Muddati o‘tgan', tone: 'error' }
    case 10:
      return { label: 'Jarayonda', tone: 'warning' }
    case 20:
      return { label: 'Bekor qilingan', tone: 'error' }
    case 25:
      return { label: 'Rad etilgan', tone: 'error' }
    case 50:
      return { label: 'Muvaffaqiyatli', tone: 'success' }
    default:
      return { label: `Noma’lum (${statusCode})`, tone: 'neutral' }
  }
}

export interface AmountTrendPoint {
  readonly period: string
  readonly count: number
  readonly amount: Money
  readonly x: number
  readonly y: number
}

function periodLabel(
  bucket: DashboardView['buckets'][number],
  groupBy: string,
): string {
  if (
    groupBy === 'DAY' ||
    groupBy === 'WEEK' ||
    groupBy === 'MONTH' ||
    groupBy === 'YEAR'
  ) {
    return bucket.label
  }

  return bucket.periodStart === bucket.periodEnd
    ? bucket.periodStart
    : `${bucket.periodStart} — ${bucket.periodEnd}`
}

export function projectAmountTrend(
  view: Pick<DashboardView, 'buckets'>,
  groupBy: string,
  width = 640,
  height = 220,
): readonly AmountTrendPoint[] {
  const amounts = view.buckets.map((bucket) =>
    BigInt(bucket.values.total.amount.minorUnits),
  )
  const maximum = amounts.reduce(
    (current, amount) => (amount > current ? amount : current),
    0n,
  )
  const horizontalPadding = 24
  const verticalPadding = 20
  const drawableWidth = Math.max(0, width - horizontalPadding * 2)
  const drawableHeight = Math.max(0, height - verticalPadding * 2)

  return Object.freeze(
    view.buckets.map((bucket, index) => {
      const amount = amounts[index] ?? 0n
      const ratio =
        maximum === 0n
          ? 0
          : Number((amount * 10_000n) / maximum) / 10_000
      const x =
        view.buckets.length <= 1
          ? width / 2
          : horizontalPadding +
            (index / (view.buckets.length - 1)) * drawableWidth

      return Object.freeze({
        period: periodLabel(bucket, groupBy),
        count: bucket.values.total.count,
        amount: bucket.values.total.amount,
        x,
        y: height - verticalPadding - ratio * drawableHeight,
      })
    }),
  )
}
