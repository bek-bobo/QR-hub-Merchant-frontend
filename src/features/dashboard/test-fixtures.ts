import type { DashboardBucket, DashboardView } from '@/shared/contracts/merchant-read'
export const dashboardZero = { count: 0, amount: { minorUnits: '0', currency: 'UZS' as const, scale: 2 as const },
  countGrowthPct: null, amountGrowthPct: null, percent: 0 }
export function nextDate(date: string) {
  const next = new Date(`${date.slice(0, 10)}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}
export function completedCoverage(start: string, end: string): Pick<DashboardBucket, 'coverageStart' | 'coverageEnd' | 'observedEnd' | 'coverage' | 'partial'> {
  const timestamp = (value: string) => value.includes('T') ? value : value + 'T00:00:00+05:00'
  return { coverageStart: timestamp(start), coverageEnd: timestamp(end), observedEnd: timestamp(end), coverage: 'COMPLETED', partial: false }
}
export const dashboardMetadata: Pick<DashboardView, 'range' | 'aggregation' | 'filters'> = {
  range: { fromDate: '2026-10-01', toDate: '2026-10-02', timezone: 'Asia/Tashkent', startInclusive: '2026-10-01T00:00:00+05:00',
    endExclusive: '2026-10-03T00:00:00+05:00', asOf: '2030-01-01T00:00:00+05:00' },
  aggregation: { requestedGranularity: 'AUTO', resolvedGranularity: 'DAY', allowedGranularities: ['DAY'], zeroBucketsIncluded: true, timeField: 'CREATED_AT' },
  filters: {},
}
