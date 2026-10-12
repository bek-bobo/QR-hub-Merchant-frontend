import { safeContractError } from '@/shared/api/errors'
import { contractObject, finiteNumber, isoCalendarDate, isoLocalDateTime, nullableFiniteNumber,
  requiredString, safeInteger, successEnvelopeData, uzsTiyin,
  type ChartGroupBy, type CountAmount, type DashboardBucket, type DashboardView, type Metric, type Outcome,
} from '@/shared/contracts/merchant-read'

const outcomes = ['total', 'success', 'failed', 'processing', 'uncategorized'] as const
function countAmount(source: Record<string, unknown>, outcome: Outcome): CountAmount {
  return Object.freeze({ count: safeInteger(source[`${outcome}Count`]), amount: uzsTiyin(source[`${outcome}Amount`]) })
}
function metric(source: Record<string, unknown>, outcome: Exclude<Outcome, 'uncategorized'>): Metric {
  return Object.freeze({ ...countAmount(source, outcome),
    countGrowthPct: nullableFiniteNumber(source[`${outcome}CountGrowth`]),
    amountGrowthPct: nullableFiniteNumber(source[`${outcome}AmountGrowth`]) })
}
function decodeMetrics(value: unknown): DashboardView['metrics'] {
  const source = contractObject(value)
  return Object.freeze({ total: metric(source, 'total'), success: metric(source, 'success'),
    processing: metric(source, 'processing'), failed: metric(source, 'failed'), uncategorized: countAmount(source, 'uncategorized') })
}
function decodePieSegment(value: unknown) {
  const source = contractObject(value), percent = finiteNumber(source.percent)
  if (percent < 0 || percent > 100) throw safeContractError()
  return Object.freeze({ count: safeInteger(source.count), amount: uzsTiyin(source.amount), percent })
}
function decodePie(value: unknown): DashboardView['pie'] {
  const source = contractObject(value)
  return Object.freeze({ success: decodePieSegment(source.success), processing: decodePieSegment(source.processing),
    failed: decodePieSegment(source.failed), uncategorized: decodePieSegment(source.uncategorized) })
}
export function decodeChartGroupBy(value: unknown): ChartGroupBy {
  if (value === 'HOUR' || value === 'DAY' || value === 'WEEK' || value === 'MONTH' || value === 'YEAR') return value
  throw safeContractError()
}
// Preserve fractional precision and offset. Never interpret a wall-clock date in browser time.
function offsetBoundary(value: unknown): string {
  if (typeof value !== 'string') throw safeContractError()
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match) throw safeContractError()
  isoLocalDateTime(match[1])
  const offset = match[2]!
  if (offset !== 'Z' && (Number(offset.slice(1, 3)) > 18 || Number(offset.slice(4, 6)) > 59 ||
    (Number(offset.slice(1, 3)) === 18 && Number(offset.slice(4, 6)) !== 0))) throw safeContractError()
  return value
}
function instant(value: string): bigint {
  const fraction = /\.(\d{1,9})/.exec(value)
  const milliseconds = Date.parse(value.replace(/\.\d{1,9}/, ''))
  return BigInt(milliseconds) * 1_000_000n + BigInt((fraction?.[1] ?? '').padEnd(9, '0'))
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw safeContractError()
  return value
}
function decodeBucket(value: unknown, groupBy: ChartGroupBy): DashboardBucket {
  const source = contractObject(value)
  const values = Object.fromEntries(outcomes.map((outcome) => [outcome, countAmount(source, outcome)])) as Record<Outcome, CountAmount>
  const boundary = groupBy === 'HOUR' ? offsetBoundary : isoCalendarDate
  const periodStart = boundary(source.periodStart), periodEnd = boundary(source.periodEnd)
  const coverageStart = offsetBoundary(source.coverageStart), coverageEnd = offsetBoundary(source.coverageEnd)
  const observedEnd = offsetBoundary(source.observedEnd), coverage = source.coverage
  if (coverage !== 'COMPLETED' && coverage !== 'PARTIAL' && coverage !== 'FUTURE') throw safeContractError()
  if ((groupBy === 'HOUR' ? instant(periodStart) >= instant(periodEnd) : periodStart >= periodEnd) || instant(coverageStart) >= instant(coverageEnd) || instant(observedEnd) < instant(coverageStart) || instant(observedEnd) > instant(coverageEnd)) throw safeContractError()
  return Object.freeze({ label: requiredString(source.label), periodKind: groupBy === 'HOUR' ? 'hour' : 'calendar',
    periodStart, periodEnd, coverageStart, coverageEnd, observedEnd, coverage, partial: boolean(source.partial), values: Object.freeze(values) })
}
export function decodeDashboardResponse(payload: unknown): DashboardView {
  const data = contractObject(successEnvelopeData(payload))
  if (!Array.isArray(data.chartStats)) throw safeContractError()
  const chartGroupBy = decodeChartGroupBy(data.chartGroupBy)
  const rawRange = contractObject(data.range), rawAggregation = contractObject(data.aggregation), rawFilters = contractObject(data.filters)
  const fromDate = isoCalendarDate(rawRange.fromDate), toDate = isoCalendarDate(rawRange.toDate)
  if (fromDate > toDate || rawRange.timezone !== 'Asia/Tashkent') throw safeContractError()
  const range = Object.freeze({ fromDate, toDate, timezone: 'Asia/Tashkent' as const,
    startInclusive: offsetBoundary(rawRange.startInclusive), endExclusive: offsetBoundary(rawRange.endExclusive), asOf: offsetBoundary(rawRange.asOf) })
  if (instant(range.startInclusive) >= instant(range.endExclusive)) throw safeContractError()
  const requestedGranularity = rawAggregation.requestedGranularity === 'AUTO' ? 'AUTO' : decodeChartGroupBy(rawAggregation.requestedGranularity)
  const resolvedGranularity = decodeChartGroupBy(rawAggregation.resolvedGranularity)
  if (!Array.isArray(rawAggregation.allowedGranularities) || rawAggregation.allowedGranularities.length === 0) throw safeContractError()
  const allowedGranularities = rawAggregation.allowedGranularities.map(decodeChartGroupBy)
  if (new Set(allowedGranularities).size !== allowedGranularities.length || !allowedGranularities.includes(resolvedGranularity) ||
    resolvedGranularity !== chartGroupBy || (requestedGranularity !== 'AUTO' && requestedGranularity !== resolvedGranularity) ||
    rawAggregation.zeroBucketsIncluded !== true || rawAggregation.timeField !== 'CREATED_AT') throw safeContractError()
  const filters = Object.freeze(rawFilters.terminalId === undefined ? {} : { terminalId: requiredString(rawFilters.terminalId) })
  const buckets = data.chartStats.map((bucket) => decodeBucket(bucket, chartGroupBy))
  for (let index = 1; index < buckets.length; index++) {
    if (chartGroupBy === 'HOUR' ? instant(buckets[index - 1]!.periodStart) >= instant(buckets[index]!.periodStart) : buckets[index - 1]!.periodStart >= buckets[index]!.periodStart) throw safeContractError()
  }
  return Object.freeze({ metrics: decodeMetrics(data.summary), pie: decodePie(data.pieStats), chartGroupBy,
    buckets: Object.freeze(buckets), range, filters,
    aggregation: Object.freeze({ requestedGranularity, resolvedGranularity, allowedGranularities: Object.freeze(allowedGranularities),
      zeroBucketsIncluded: true as const, timeField: 'CREATED_AT' as const }) })
}
