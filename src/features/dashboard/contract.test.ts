import { describe, expect, it } from 'vitest'
import { decodeDashboardResponse } from './contract'
import { ALL_TREND_SERIES, createTrendPlotConfig, trendPlotData } from './trend-presentation'
import { readMerchantPlotTheme } from './plot-theme'

const summary = {
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

function payload(chartGroupBy: string, periodStart: unknown, periodEnd: unknown = periodStart) {
  return { success: true, data: {
    summary,
    pieStats: {
      success: { count: 1, amount: 100000, percent: 100 },
      failed: { count: 0, amount: 0, percent: 0 },
      processing: { count: 0, amount: 0, percent: 0 },
    },
    chartGroupBy,
    chartStats: [{ ...summary, label: '01.10.2026 14:00', periodStart, periodEnd }],
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
    ['2026-10-01T14:00', '2026-10-01T15:00'],
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
    '2026-10-01T14:00:00Zjunk', '2026-10-01', '', null,
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
    const data = trendPlotData(decoded, 'count')
    expect(data).toHaveLength(4)
    expect(data.every((datum) => datum.period === '01.10.2026 14:00')).toBe(true)
    const theme = readMerchantPlotTheme({ fontFamily: 'Inter', getPropertyValue: (name) => name }, false)
    const config = createTrendPlotConfig(decoded, 'count', ALL_TREND_SERIES, theme)
    const tooltip = config.tooltip as { title: (datum: typeof data[number]) => string }
    const title = tooltip.title
    expect(title(data[0]!)).toBe('01.10.2026 14:00')
    expect(JSON.stringify(decoded)).toBe(original)
  })

  it('decodes exact UZS minor units and nullable growth', () => {
    const decoded = decodeDashboardResponse({
      success: true,
      data: {
        summary,
        pieStats: {
          success: { count: 1, amount: 100000, percent: 100 },
          failed: { count: 0, amount: 0, percent: 0 },
          processing: { count: 0, amount: 0, percent: 0 },
        },
        chartGroupBy: 'DAY',
        chartStats: [
          {
            label: '15.09',
            periodStart: '2026-09-15',
            periodEnd: '2026-09-15',
            totalCount: 1,
            successCount: 1,
            failedCount: 0,
            processingCount: 0,
            totalAmount: 100000,
            successAmount: 100000,
            failedAmount: 0,
            processingAmount: 0,
          },
        ],
      },
    })

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
    expect(() =>
      decodeDashboardResponse({
        success: true,
        data: {
          summary: { ...summary, totalAmount: 9007199254740992 },
          pieStats: {
            success: { count: 1, amount: 100000, percent: 100 },
            failed: { count: 0, amount: 0, percent: 0 },
            processing: { count: 0, amount: 0, percent: 0 },
          },
          chartGroupBy: 'DAY',
          chartStats: [],
        },
      }),
    ).toThrow()
  })
})
