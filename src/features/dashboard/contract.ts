import { safeContractError } from '@/shared/api/errors'
import {
  contractObject,
  finiteNumber,
  isoCalendarDate,
  isoLocalDateTime,
  nullableFiniteNumber,
  requiredString,
  safeInteger,
  successEnvelopeData,
  uzsTiyin,
  type ChartGroupBy,
  type CountAmount,
  type DashboardBucket,
  type DashboardView,
  type Metric,
  type Outcome,
} from '@/shared/contracts/merchant-read'

const outcomes = ['total', 'success', 'failed', 'processing'] as const

function countAmount(source: Record<string, unknown>, outcome: Outcome): CountAmount {
  return Object.freeze({
    count: safeInteger(source[`${outcome}Count`]),
    amount: uzsTiyin(source[`${outcome}Amount`]),
  })
}

function metric(source: Record<string, unknown>, outcome: Outcome): Metric {
  return Object.freeze({
    ...countAmount(source, outcome),
    countGrowthPct: nullableFiniteNumber(source[`${outcome}CountGrowth`]),
    amountGrowthPct: nullableFiniteNumber(source[`${outcome}AmountGrowth`]),
  })
}

function decodeMetrics(value: unknown): Readonly<Record<Outcome, Metric>> {
  const source = contractObject(value)
  return Object.freeze({
    total: metric(source, 'total'),
    success: metric(source, 'success'),
    processing: metric(source, 'processing'),
    failed: metric(source, 'failed'),
  })
}

function decodePieSegment(value: unknown) {
  const source = contractObject(value)
  const percent = finiteNumber(source.percent)
  if (percent < 0 || percent > 100) {
    throw safeContractError()
  }

  return Object.freeze({
    count: safeInteger(source.count),
    amount: uzsTiyin(source.amount),
    percent,
  })
}

function decodePie(value: unknown): DashboardView['pie'] {
  const source = contractObject(value)
  return Object.freeze({
    success: decodePieSegment(source.success),
    processing: decodePieSegment(source.processing),
    failed: decodePieSegment(source.failed),
  })
}

function decodeChartGroupBy(value: unknown): ChartGroupBy {
  if (value === 'HOUR' || value === 'DAY' || value === 'WEEK' || value === 'MONTH' || value === 'YEAR') {
    return value
  }

  throw safeContractError()
}

// Validate the local date/time and optional ISO offset separately. Do not parse
// through Date: it can normalize invalid dates or interpret offsetless values
// in the browser timezone. Keep backend precision and offset unchanged.
function hourBoundary(value: unknown): string {
  if (typeof value !== 'string') throw safeContractError()
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)(Z|[+-]\d{2}:\d{2})?$/.exec(value)
  if (!match) throw safeContractError()
  isoLocalDateTime(match[1])
  const offset = match[2]
  if (offset && offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4, 6)) > 59)) {
    throw safeContractError()
  }
  return value
}

function decodeBucket(value: unknown, groupBy: ChartGroupBy): DashboardBucket {
  const source = contractObject(value)
  const values = Object.fromEntries(
    outcomes.map((outcome) => [outcome, countAmount(source, outcome)]),
  ) as Record<Outcome, CountAmount>

  return Object.freeze({
    label: requiredString(source.label),
    periodKind: groupBy === 'HOUR' ? 'hour' : 'calendar',
    periodStart: groupBy === 'HOUR' ? hourBoundary(source.periodStart) : isoCalendarDate(source.periodStart),
    periodEnd: groupBy === 'HOUR' ? hourBoundary(source.periodEnd) : isoCalendarDate(source.periodEnd),
    values: Object.freeze(values),
  })
}

export function decodeDashboardResponse(payload: unknown): DashboardView {
  const data = contractObject(successEnvelopeData(payload))
  if (!Array.isArray(data.chartStats)) {
    throw safeContractError()
  }
  const chartGroupBy = decodeChartGroupBy(data.chartGroupBy)

  return Object.freeze({
    metrics: decodeMetrics(data.summary),
    pie: decodePie(data.pieStats),
    chartGroupBy,
    buckets: Object.freeze(data.chartStats.map((bucket) => decodeBucket(bucket, chartGroupBy))),
  })
}
