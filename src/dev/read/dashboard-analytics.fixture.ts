// Simulated server domain, DEV-only. Live Dashboard never imports or generates buckets.
import type { ChartGroupBy, DashboardCoverage, DashboardRequest, DashboardView } from '@/shared/contracts/merchant-read'
export function simulateDashboardDomain(filters: DashboardRequest) {
  const start = new Date(`${filters.fromDate}T00:00:00Z`), end = new Date(`${filters.toDate}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  const days = (end.getTime() - start.getTime()) / 86400000
  const requested = filters.granularity ?? 'AUTO'
  const resolved: ChartGroupBy = requested === 'AUTO' ? days <= 7 ? 'HOUR' : days <= 365 ? 'DAY' : 'MONTH' : requested
  function floor(date: Date, group: ChartGroupBy) {
    const value = new Date(date)
    if (group !== 'HOUR') value.setUTCHours(0, 0, 0, 0)
    if (group === 'WEEK') value.setUTCDate(value.getUTCDate() - (value.getUTCDay() + 6) % 7)
    if (group === 'MONTH' || group === 'YEAR') value.setUTCDate(1)
    if (group === 'YEAR') value.setUTCMonth(0)
    return value
  }
  function next(date: Date, group: ChartGroupBy) {
    const value = new Date(date)
    if (group === 'HOUR') value.setUTCHours(value.getUTCHours() + 1)
    else if (group === 'DAY' || group === 'WEEK') value.setUTCDate(value.getUTCDate() + (group === 'DAY' ? 1 : 7))
    else if (group === 'MONTH') value.setUTCMonth(value.getUTCMonth() + 1)
    else value.setUTCFullYear(value.getUTCFullYear() + 1)
    return value
  }
  const count = (group: ChartGroupBy) => {
    let total = 0
    for (let date = floor(start, group); date < end && total <= 400; date = next(date, group)) total++
    return total
  }
  // Fake backend metadata; the live client enables choices only from real response metadata.
  const allowed: ChartGroupBy[] = days <= 7 ? ['HOUR', ...(days >= 3 ? ['DAY' as const] : [])]
    : days <= 365 ? ['DAY', ...(days >= 14 && count('WEEK') >= 3 ? ['WEEK' as const] : []),
      ...(days >= 60 && count('MONTH') >= 3 ? ['MONTH' as const] : [])]
    : ['MONTH', ...(count('WEEK') <= 400 ? ['WEEK' as const] : []), ...(days >= 730 && count('YEAR') >= 3 ? ['YEAR' as const] : [])]
  if (!Number.isFinite(days) || days < 1 || days > 3653 || !allowed.includes(resolved) || count(resolved) > 400) throw new Error('Invalid DEV analytics granularity/range')
  const asOf = '2026-09-15T12:00:00+05:00'
  const observed = new Date('2026-09-15T12:00:00Z')
  const timestamp = (date: Date) => date.toISOString().slice(0, 19) + '+05:00'
  const buckets = []
  for (let date = floor(start, resolved); date < end; date = next(date, resolved)) {
    const periodEnd = next(date, resolved)
    const coverageStart = new Date(Math.max(+start, +date)), coverageEnd = new Date(Math.min(+end, +periodEnd))
    const coverage: DashboardCoverage = coverageStart >= observed ? 'FUTURE' : coverageEnd > observed ? 'PARTIAL' : 'COMPLETED'
    buckets.push({ label: resolved === 'HOUR' ? `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}` : date.toISOString().slice(0, 10),
      periodKind: resolved === 'HOUR' ? 'hour' as const : 'calendar' as const,
      periodStart: resolved === 'HOUR' ? timestamp(date) : date.toISOString().slice(0, 10),
      periodEnd: resolved === 'HOUR' ? timestamp(periodEnd) : periodEnd.toISOString().slice(0, 10),
      coverageStart: timestamp(coverageStart), coverageEnd: timestamp(coverageEnd),
      observedEnd: timestamp(new Date(Math.max(+coverageStart, Math.min(+coverageEnd, +observed)))), coverage,
      partial: +coverageStart > +date || +coverageEnd < +periodEnd || (coverageStart < observed && coverageEnd > observed) })
  }
  const metadata: Pick<DashboardView, 'range' | 'aggregation' | 'filters' | 'chartGroupBy'> = {
    range: { fromDate: filters.fromDate, toDate: filters.toDate, timezone: 'Asia/Tashkent', startInclusive: timestamp(start), endExclusive: timestamp(end), asOf },
    aggregation: { requestedGranularity: requested, resolvedGranularity: resolved, allowedGranularities: allowed, zeroBucketsIncluded: true, timeField: 'CREATED_AT' },
    filters: filters.terminalId ? { terminalId: filters.terminalId } : {}, chartGroupBy: resolved,
  }
  return { metadata, buckets }
}
