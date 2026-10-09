import { createDashboardPresentation } from './presentation'
import { localeMessages } from '@/test/locale-fixture'
const presentation = createDashboardPresentation('uz', localeMessages('dashboard'))
import { describe, expect, it } from 'vitest'
import type { DashboardBucket } from '@/shared/contracts/merchant-read'
import { ALL_TREND_SERIES, createTrendPlotConfig, trendPlotData, trendTooltipItem } from './trend-presentation'
import { readMerchantPlotTheme } from './plot-theme'
import { completedCoverage, dashboardZero } from './test-fixtures'

const values = { total: dashboardZero, success: dashboardZero, processing: dashboardZero, failed: dashboardZero, uncategorized: dashboardZero }
const completed: DashboardBucket = { label: 'observed zero', periodKind: 'calendar', periodStart: '2026-10-01', periodEnd: '2026-10-02',
  ...completedCoverage('2026-10-01', '2026-10-02'), values }
const partial: DashboardBucket = { ...completed, label: 'partial', periodStart: '2026-10-02', periodEnd: '2026-10-03',
  ...completedCoverage('2026-10-02', '2026-10-03'), observedEnd: '2026-10-02T12:00:00+05:00', coverage: 'PARTIAL', partial: true,
  values: { ...values, total: { count: 7, amount: { ...dashboardZero.amount, minorUnits: '12345' } } } }
const future: DashboardBucket = { ...completed, label: 'future', periodStart: '2026-10-03', periodEnd: '2026-10-04',
  ...completedCoverage('2026-10-03', '2026-10-04'), observedEnd: '2026-10-03T00:00:00+05:00', coverage: 'FUTURE', partial: true }

describe('Canonical bucket coverage presentation', () => {
  it.each(['count', 'amount'] as const)('preserves the dense domain and separates observed zero from unobserved %s', (mode) => {
    const view = { buckets: [completed, partial, future] }
    const original = JSON.stringify(view)
    const data = trendPlotData(presentation, view, mode, ALL_TREND_SERIES)
    expect(data.filter(({ key }) => key === 'total').map(({ value }) => value)).toEqual([0, mode === 'count' ? 7 : 123.45, null])
    expect(data.filter(({ coverage }) => coverage === 'FUTURE').every(({ value }) => value === null)).toBe(true)
    expect(trendTooltipItem(data[8]!).value).toBe('Hali kuzatilmagan')
    const tooltip = createTrendPlotConfig(presentation, view, mode, ALL_TREND_SERIES, readMerchantPlotTheme({ fontFamily: 'Inter', getPropertyValue: name => name }, false)).tooltip as { title: (datum: typeof data[number]) => string }
    expect(tooltip.title(data[4]!)).toContain('Qisman davr')
    const theme = readMerchantPlotTheme({ fontFamily: 'Inter', getPropertyValue: (name) => name }, false)
    const config = createTrendPlotConfig(presentation, view, mode, ALL_TREND_SERIES, theme)
    expect(config.scale?.x).toMatchObject({ domain: ['0', '1', '2'] })
    expect(data.map(({ period }) => period)).toEqual(Array(4).fill('observed zero').concat(Array(4).fill('partial'), Array(4).fill('future')))
    expect(data[4]!.interval).toBe('2026-10-02 ≤ vaqt < 2026-10-03')
    expect(JSON.stringify(view)).toBe(original)
  })
})
