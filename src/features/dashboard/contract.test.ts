import { createDashboardPresentation } from './presentation'
import { localeMessages } from '@/test/locale-fixture'
const presentation = createDashboardPresentation('uz', localeMessages('dashboard'))
import { describe, expect, it } from 'vitest'
import { decodeDashboardResponse } from './contract'
import { ALL_TREND_SERIES, createTrendPlotConfig, trendPlotData } from './trend-presentation'
import { readMerchantPlotTheme } from './plot-theme'

const summary = {
  uncategorizedCount: 0,
  uncategorizedAmount: 0,
  totalCount: 1,
  successCount: 1,
  failedCount: 0,
  processingCount: 0,
  totalAmount: 100000,
  successAmount: 100000,
  failedAmount: 0,
  processingAmount: 0,
  totalCountGrowth: null,
  successCountGrowth: 25,
  failedCountGrowth: null,
  processingCountGrowth: null,
  totalAmountGrowth: null,
  successAmountGrowth: 12.5,
  failedAmountGrowth: null,
  processingAmountGrowth: null,
}

function payload(chartGroupBy: string, periodStart: unknown, periodEnd: unknown = '2026-10-08') {
  const start = chartGroupBy === 'HOUR' ? periodStart : '2026-10-01T00:00:00+05:00'
  const end = chartGroupBy === 'HOUR' ? periodEnd : '2026-10-08T00:00:00+05:00'
  return { success: true, data: {
    summary,
    range: { fromDate: '2026-10-01', toDate: '2026-10-07', timezone: 'Asia/Tashkent', startInclusive: '2026-10-01T00:00:00+05:00', endExclusive: '2026-10-08T00:00:00+05:00', asOf: '2030-01-01T00:00:00+05:00' },
    aggregation: { requestedGranularity: 'AUTO', resolvedGranularity: chartGroupBy, allowedGranularities: [chartGroupBy], zeroBucketsIncluded: true, timeField: 'CREATED_AT' },
    filters: { terminalId: 'a' },
    pieStats: { success: { count: 1, amount: 100000, percent: 100 }, failed: { count: 0, amount: 0, percent: 0 },
      processing: { count: 0, amount: 0, percent: 0 }, uncategorized: { count: 0, amount: 0, percent: 0 } },
    chartGroupBy,
    chartStats: [{ ...summary, label: '01.10.2026 14:00', periodStart, periodEnd, coverageStart: start, coverageEnd: end, observedEnd: end, coverage: 'COMPLETED', partial: false }],
  } }
}

describe('dashboard read contract', () => {
  it.each(['DAY', 'WEEK', 'MONTH', 'YEAR'])('preserves %s and its calendar boundaries', (group) => {
    const decoded = decodeDashboardResponse(payload(group, '2026-10-01', '2026-10-07'))
    expect(decoded.chartGroupBy).toBe(group)
    expect(decoded.buckets[0]).toMatchObject({ periodKind: 'calendar', periodStart: '2026-10-01', periodEnd: '2026-10-07' })
    expect(decoded.metrics.total.count).toBe(1)
    expect(decoded.pie.success.amount.minorUnits).toBe('100000')
  })

  it.each([
    ['2026-10-01T14:00:00+05:00', '2026-10-01T15:00:00+05:00'],
    ['2026-10-01T09:00:00Z', '2026-10-01T10:00:00Z'],
    ['2026-10-01T14:00:00.123456789+05:00', '2026-10-01T15:00:00.123456789+05:00'],
    ['2026-10-01T14:00:00-03:30', '2026-10-01T15:00:00-03:30'],
  ])('preserves HOUR timestamps without timezone conversion: %s', (start, end) => {
    const decoded = decodeDashboardResponse(payload('HOUR', start, end))
    expect(decoded.chartGroupBy).toBe('HOUR')
    expect(decoded.buckets[0]).toMatchObject({ periodKind: 'hour', periodStart: start, periodEnd: end, label: '01.10.2026 14:00' })
    expect(decoded.buckets[0]?.values.total.amount.minorUnits).toBe('100000')
  })

  it.each([
    '2026-02-29T14:00:00+05:00', '2026-10-01T24:00:00+05:00',
    '2026-10-01T14:60:00+05:00', '2026-10-01T14:00:60+05:00',
    '2026-10-01T14:00:00+24:00', '2026-10-01T14:00:00+05:60',
    '2026-10-01T14:00:00+0500', '2026-10-01T14:00:00+05',
    '2026-10-01 14:00:00+05:00', '2026-10-01T14:00:00.1234567890Z',
    '2026-10-01T14:00', '2026-10-01T14:00:00Zjunk', '2026-10-01', '', null,
  ])('rejects malformed hourly boundaries: %s', (invalid) => {
    const valid = '2026-10-01T14:00:00+05:00'
    expect(() => decodeDashboardResponse(payload('HOUR', invalid, valid))).toThrow()
    expect(() => decodeDashboardResponse(payload('HOUR', valid, invalid))).toThrow()
  })

  it.each(['DAY', 'WEEK', 'MONTH', 'YEAR'])('rejects malformed dates and timestamp boundaries for %s', (group) => {
    for (const invalid of ['2026-02-30', '2026-13-01', '2026-10-01T14:00:00+05:00', 'anything']) {
      expect(() => decodeDashboardResponse(payload(group, invalid))).toThrow()
    }
  })

  it('rejects unknown grouping and retains hourly labels through the plot and tooltip', () => {
    expect(() => decodeDashboardResponse(payload('MINUTE', '2026-10-01'))).toThrow()
    const decoded = decodeDashboardResponse(payload('HOUR', '2026-10-01T14:00:00+05:00', '2026-10-01T15:00:00+05:00'))
    const original = JSON.stringify(decoded)
    const data = trendPlotData(presentation, decoded, 'count', ALL_TREND_SERIES)
    expect(data).toHaveLength(4)
    expect(data.every((datum) => datum.period === '01.10.2026 14:00')).toBe(true)
    const theme = readMerchantPlotTheme({ fontFamily: 'Inter', getPropertyValue: (name) => name }, false)
    const config = createTrendPlotConfig(presentation, decoded, 'count', ALL_TREND_SERIES, theme)
    const tooltip = config.tooltip as { title: (datum: typeof data[number]) => string }
    const title = tooltip.title
    expect(title(data[0]!)).toContain('14:00 ≤ vaqt < 15:00')
    expect(JSON.stringify(decoded)).toBe(original)
  })

  it('decodes exact UZS minor units and nullable growth', () => {
    const decoded = decodeDashboardResponse(payload('DAY', '2026-09-15', '2026-09-16'))

    expect(decoded.metrics.total.amount).toEqual({
      minorUnits: '100000',
      currency: 'UZS',
      scale: 2,
    })
    expect(decoded.metrics.total.countGrowthPct).toBeNull()
    expect(decoded.metrics.success.amountGrowthPct).toBe(12.5)
    expect(decoded.buckets[0]?.periodStart).toBe('2026-09-15')
  })

  it('rejects a malformed envelope and unsafe Long amount', () => {
    expect(() => decodeDashboardResponse({ data: {} })).toThrow()
    const unsafe = payload('DAY', '2026-10-01', '2026-10-02')
    unsafe.data.summary = { ...summary, totalAmount: 9007199254740992 }
    expect(() => decodeDashboardResponse(unsafe)).toThrow()
  })
})

describe('Verified analytics metadata and dense contract', () => {
  it('retains range, aggregation, terminal, unknown money and authoritative rounded percentages', () => {
    const source = payload('DAY', '2026-10-01', '2026-10-02')
    source.data.summary = { ...summary, uncategorizedCount: 1, uncategorizedAmount: 987654321 }
    source.data.chartStats[0]!.uncategorizedCount = 1
    source.data.chartStats[0]!.uncategorizedAmount = 987654321
    source.data.pieStats.uncategorized = { count: 1, amount: 987654321, percent: 33.33 }
    source.data.pieStats.success.percent = 33.33
    source.data.pieStats.processing.percent = 33.33
    const decoded = decodeDashboardResponse(source)
    expect(decoded.range).toEqual(source.data.range)
    expect(decoded.aggregation).toEqual(source.data.aggregation)
    expect(decoded.filters).toEqual({ terminalId: 'a' })
    expect(decoded.metrics.uncategorized.amount.minorUnits).toBe('987654321')
    expect(decoded.buckets[0]!.values.uncategorized.count).toBe(1)
    expect(decoded.pie.processing.percent).toBe(33.33)
    expect(decoded.pie.uncategorized.percent).toBe(33.33)
    expect(decoded.buckets[0]!.coverage).toBe('COMPLETED')
  })
  it.each([
    ['requestedGranularity', 'MINUTE'], ['resolvedGranularity', 'AUTO'], ['allowedGranularities', ['AUTO']],
    ['allowedGranularities', []], ['allowedGranularities', ['DAY', 'DAY']], ['zeroBucketsIncluded', false],
    ['zeroBucketsIncluded', 'true'], ['timeField', 'UPDATED_AT'],
  ])('rejects invalid aggregation %s=%j', (field, invalid) => {
    const source = payload('DAY', '2026-10-01', '2026-10-02')
    Object.assign(source.data.aggregation, { [field]: invalid })
    expect(() => decodeDashboardResponse(source)).toThrow()
  })
  it.each([
    ['coverage', 'UNKNOWN'], ['partial', 'false'], ['observedEnd', null], ['coverageStart', '2026-10-01'],
    ['periodEnd', '2026-09-30'], ['observedEnd', '2026-10-09T00:00:00+05:00'],
  ])('rejects invalid bucket %s=%j', (field, invalid) => {
    const source = payload('DAY', '2026-10-01', '2026-10-02')
    Object.assign(source.data.chartStats[0]!, { [field]: invalid })
    expect(() => decodeDashboardResponse(source)).toThrow()
  })
  it.each(['range', 'aggregation', 'filters', 'pieStats'])('requires %s metadata', (field) => {
    const source = payload('DAY', '2026-10-01', '2026-10-02')
    Reflect.deleteProperty(source.data, field)
    expect(() => decodeDashboardResponse(source)).toThrow()
  })
  it('keeps zero buckets in supplied order without synthesizing missing dates and rejects reversed order', () => {
    const source = payload('DAY', '2026-10-01', '2026-10-02')
    const zero = { ...source.data.chartStats[0]!, totalCount: 0, successCount: 0, totalAmount: 0, successAmount: 0,
      label: 'third', periodStart: '2026-10-03', periodEnd: '2026-10-04', coverage: 'FUTURE', partial: true,
      coverageStart: '2026-10-03T00:00:00+05:00', coverageEnd: '2026-10-04T00:00:00+05:00', observedEnd: '2026-10-03T00:00:00+05:00' }
    source.data.chartStats.push(zero)
    const decoded = decodeDashboardResponse(source)
    expect(decoded.buckets.map(({ periodStart }) => periodStart)).toEqual(['2026-10-01', '2026-10-03'])
    expect(decoded.buckets[1]!.values.total.count).toBe(0)
    source.data.chartStats.reverse()
    expect(() => decodeDashboardResponse(source)).toThrow()
  })
  it('compares actual offset instants and nanoseconds while preserving boundary strings', () => {
    const source = payload('HOUR', '2026-10-01T14:00:00.000000001+05:00', '2026-10-01T10:00:00Z')
    expect(decodeDashboardResponse(source).buckets[0]!.periodEnd).toBe('2026-10-01T10:00:00Z')
  })
})
