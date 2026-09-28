import { safeContractError } from '@/shared/api/errors'
import {
  contractObject,
  finiteNumber,
  isoCalendarDate,
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
  if (value === 'DAY' || value === 'WEEK' || value === 'MONTH' || value === 'YEAR') {
    return value
  }

  throw safeContractError()
}

function decodeBucket(value: unknown): DashboardBucket {
  const source = contractObject(value)
  const values = Object.fromEntries(
    outcomes.map((outcome) => [outcome, countAmount(source, outcome)]),
  ) as Record<Outcome, CountAmount>

  return Object.freeze({
    label: requiredString(source.label),
    periodStart: isoCalendarDate(source.periodStart),
    periodEnd: isoCalendarDate(source.periodEnd),
    values: Object.freeze(values),
  })
}

export function decodeDashboardResponse(payload: unknown): DashboardView {
  const data = contractObject(successEnvelopeData(payload))
  if (!Array.isArray(data.chartStats)) {
    throw safeContractError()
  }

  return Object.freeze({
    metrics: decodeMetrics(data.summary),
    pie: decodePie(data.pieStats),
    chartGroupBy: decodeChartGroupBy(data.chartGroupBy),
    buckets: Object.freeze(data.chartStats.map(decodeBucket)),
  })
}
