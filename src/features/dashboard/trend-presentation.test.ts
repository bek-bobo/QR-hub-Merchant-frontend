import { createDashboardPresentation } from './presentation'
import { localeMessages } from '@/test/locale-fixture'
const presentation = createDashboardPresentation('uz', localeMessages('dashboard'))
import { describe, expect, it } from 'vitest'
import type { DashboardBucket } from '@/shared/contracts/merchant-read'
import { DEFAULT_TREND_SERIES, availableTrendSeries, createTrendPlotConfig, toggleTrendSeries, trendPlotData, trendInteractionKey, trendTooltipItem, trendAxisLabel, trendTickFilter, trendPeriodTitle } from './trend-presentation'
import { readMerchantPlotTheme } from './plot-theme'
import { completedCoverage, dashboardZero } from './test-fixtures'
const theme = readMerchantPlotTheme({ fontFamily: 'Inter', getPropertyValue: (name) => name }, false)
function bucket(label = 'backend'): DashboardBucket {
  const metric = (count: number, minorUnits: string) => ({ count, amount: { minorUnits, currency: 'UZS' as const, scale: 2 as const } })
  return { label, periodKind: 'calendar', periodStart: '2026-10-01', periodEnd: '2026-10-02', ...completedCoverage('2026-10-01', '2026-10-02'),
    values: { total: metric(99, '900719925474099301'), success: metric(3, '12345'), processing: metric(1, '1'), failed: metric(7, '8000000'), uncategorized: dashboardZero } }
}
describe('Final transaction chart presentation', () => {
  it('F09 standalone config scans availability once rather than once per candidate series', () => {
    let reads = 0
    const buckets = Array.from({ length: 12 }, () => {
      const original = bucket()
      return { ...original, get values() { reads += 1; return original.values } }
    })
    const config = createTrendPlotConfig(presentation, { buckets }, 'count', DEFAULT_TREND_SERIES, theme)
    expect(config.data).toHaveLength(36)
    // One availability visit plus three selected datum reads per bucket.
    expect(reads).toBe(12 * 4)
  })

  it('F09 semantic identity distinguishes exact money changes beyond Number precision', () => {
    const original = bucket()
    const next = { ...original, values: { ...original.values,
      total: { ...original.values.total, amount: { ...original.values.total.amount, minorUnits: '900719925474099302' } } } }
    const identity = (value: DashboardBucket) => trendInteractionKey([value], 'DAY', 'amount', ['total'], trendPlotData(presentation, { buckets: [value] }, 'amount', ['total']))
    expect(Number(original.values.total.amount.minorUnits)).toBe(Number(next.values.total.amount.minorUnits))
    expect(identity(original)).not.toBe(identity(next))
    expect(identity(structuredClone(original))).toBe(identity(original))
  })

  it.each(['PARTIAL', 'FUTURE'] as const)('F09 resets on changed %s coverage content', (coverage) => {
    const original = bucket(), next = { ...original, coverage }
    const identity = (value: DashboardBucket) => trendInteractionKey([value], 'DAY', 'count', DEFAULT_TREND_SERIES, trendPlotData(presentation, { buckets: [value] }, 'count'))
    expect(identity(original)).not.toBe(identity(next))
  })
  it('disables permanent point marks and configures native shared active markers with subtle status areas', () => {
    const config = createTrendPlotConfig(presentation, { buckets: [bucket()] }, 'count', DEFAULT_TREND_SERIES, theme)
    expect(config.point).toBeUndefined()
    expect(config).toMatchObject({ shapeField: 'smooth', legend: false, style: { lineWidth: 2.5, connect: false },
      interaction: { tooltip: { marker: true, shared: true, series: true, wait: 0, trailing: false, crosshairsX: true, style: { markerR: 4 } } } })
    expect(config.area).toMatchObject({ shapeField: 'smooth', zIndex: 0, tooltip: false, style: { fillOpacity: 0.07, strokeOpacity: 0, connect: false } })
    expect((config.data as ReturnType<typeof trendPlotData>).map(({ type }) => type)).toEqual(['Muvaffaqiyatli', 'Jarayonda', 'Muvaffaqiyatsiz'])
    expect(config.children).toBeUndefined()
  })
  it('keeps the native shared tooltip inside the chart with real CSS property names', () => {
    const config = createTrendPlotConfig(presentation, { buckets: [bucket()] }, 'count', DEFAULT_TREND_SERIES, theme)
    expect(config.interaction?.tooltip).toMatchObject({ css: {
      '.g2-tooltip': { transition: 'none',
        'max-width': 'min(280px, calc(100% - 16px))', 'box-sizing': 'border-box', 'border-radius': '12px' },
      '.g2-tooltip-title': { 'white-space': 'normal', 'font-weight': '600' },
      '.g2-tooltip-list-item-value': { 'font-variant-numeric': 'tabular-nums', 'text-align': 'right' },
    } })
  })
  it.each([
    ['2026-09-09T12:00:00+05:00', '2026-09-09T13:00:00+05:00', '09.09.2026 · 12:00 ≤ vaqt < 13:00'],
    ['2026-09-09T23:00:00+05:00', '2026-09-10T00:00:00+05:00', '09.09.2026 23:00 ≤ vaqt < 10.09.2026 00:00'],
    ['2026-12-31T23:00:00+05:00', '2027-01-01T00:00:00+05:00', '31.12.2026 23:00 ≤ vaqt < 01.01.2027 00:00'],
  ])('preserves local exclusive hourly interval %s → %s', (periodStart, periodEnd, title) => {
    const value = { ...bucket(), periodStart, periodEnd }
    expect(trendPeriodTitle(presentation, value, 'HOUR')).toBe(title)
    for (const coverage of ['PARTIAL', 'FUTURE'] as const) {
      const view = { buckets: [{ ...value, coverage, partial: true }], chartGroupBy: 'HOUR' as const }
      const data = trendPlotData(presentation, view, 'amount')
      const tooltip = createTrendPlotConfig(presentation, view, 'amount', DEFAULT_TREND_SERIES, theme).tooltip as { title: (datum: typeof data[number]) => string }
      expect(tooltip.title(data[0]!)).toBe(`${title} · ${coverage === 'PARTIAL' ? 'Qisman davr' : 'Hali kuzatilmagan'}`)
      expect(data[0]!.interval).toBe(`${periodStart} ≤ vaqt < ${periodEnd}`)
    }
  })
  it.each([['DAY', '01.10.2026'], ['WEEK', '01.10.2026 haftasi'], ['MONTH', presentation.month('2026-10-01')], ['YEAR', '2026']] as const)('preserves existing %s tooltip titles', (group, title) => {
    expect(trendPeriodTitle(presentation, bucket(), group)).toBe(title)
  })
  it.each(['count', 'amount'] as const)('formats exact %s values for each visible status without touching the API data', (mode) => {
    const view = { buckets: [bucket('A'), bucket('B')] }, original = JSON.stringify({ buckets: [bucket('A'), bucket('B')] })
    const data = trendPlotData(presentation, view, mode)
    expect(data.map(({ key }) => key)).toEqual(['success', 'processing', 'failed', 'success', 'processing', 'failed'])
    expect(data.slice(0, 3).map(({ value }) => value)).toEqual(mode === 'count' ? [3, 1, 7] : [123.45, 0.01, 80000])
    expect(trendTooltipItem(data[0]!).value).toBe(mode === 'count' ? '3' : '123.45 UZS')
    expect(trendTooltipItem(data[1]!).value).toBe(mode === 'count' ? '1' : '0.01 UZS')
    const total = trendPlotData(presentation, view, mode, ['total'])[0]!
    expect(total.amount.minorUnits).toBe('900719925474099301')
    expect(trendTooltipItem(total).value).toBe(mode === 'count' ? '99' : '9 007 199 254 740 993.01 UZS')
    expect(JSON.stringify(view)).toBe(original)
  })
  it.each(['count', 'amount'] as const)('keeps scales accurate for visible %s and auxiliary marks', (mode) => {
    const config = createTrendPlotConfig(presentation, { buckets: [bucket()] }, mode, ['success', 'processing'], theme)
    expect(config.scale).toMatchObject({ y: { domainMin: 0, domainMax: mode === 'count' ? 4 : 123.45 } })
    expect(config.area?.scale).toEqual(config.scale)
    expect(config.area?.axis).toEqual(config.axis)
    expect((config.data as ReturnType<typeof trendPlotData>).map(({ key }) => key)).toEqual(['success', 'processing'])
  })
  it.each([false, true])('uses semantic colors and lightweight areas in both themes (dark=%s)', (dark) => {
    const config = createTrendPlotConfig(presentation, { buckets: [bucket()] }, 'count', ['total', 'success'], { ...theme, dark })
    expect(config.theme).toBe(dark ? 'classicDark' : 'classic')
    expect(config.scale?.color).toMatchObject({ range: [...theme.colors] })
    expect((config.area!.data as ReturnType<typeof trendPlotData>).map(({ key }) => key)).toEqual(['success'])
    expect(config.stack).toBeUndefined(); expect(config.normalize).toBeUndefined()
  })
  it('retains every canonical dense category while only filtering axis ticks, including at mobile width', () => {
    const buckets = Array.from({ length: 168 }, (_, index) => bucket(`backend-${index}`))
    const config = createTrendPlotConfig(presentation, { buckets }, 'count', DEFAULT_TREND_SERIES, theme, 326)
    expect(config.scale?.x?.domain).toHaveLength(168)
    expect(config.data).toHaveLength(504)
    const shown = buckets.map((_, index) => index).filter(index => trendTickFilter(168, 326)(undefined, index))
    expect(shown).toEqual([0, 84, 167])
    expect(config.axis?.x).toMatchObject({ labelAutoHide: true, labelAutoRotate: false })
    expect(config.scale?.x).toMatchObject({ range: [0.02, 0.98] })
  })
  it.each([['HOUR', '01.10 00:00'], ['DAY', '01.10'], ['WEEK', '01.10 haftasi'], ['MONTH', presentation.month('2026-10-01')], ['YEAR', '2026']] as const)('localizes %s axis labels', (group, expected) => {
    const value = { ...bucket(), periodStart: '2026-10-01T00:00:00+05:00' }
    expect(trendAxisLabel(presentation, value, group)).toBe(expected)
  })
  it('hides zero Uncategorized from legend/data and uses its own neutral color for nonzero data', () => {
    const view = { buckets: [bucket()] }
    expect(availableTrendSeries(view)).not.toContain('uncategorized')
    const unknown = { ...bucket(), values: { ...bucket().values, uncategorized: { count: 1, amount: { ...dashboardZero.amount, minorUnits: '10' } } } }
    const config = createTrendPlotConfig(presentation, { buckets: [unknown] }, 'amount', DEFAULT_TREND_SERIES, theme)
    expect((config.data as ReturnType<typeof trendPlotData>).at(-1)).toMatchObject({ key: 'uncategorized', type: 'Tasniflanmagan', value: 0.1 })
    expect(config.scale?.color?.range).toEqual([...theme.colors, theme.secondary])
  })
  it('preserves duplicate labels, empty data and genuinely observed zero', () => {
    expect(trendPlotData(presentation, { buckets: [bucket('same'), bucket('same')] }, 'count').map(({ bucket }) => bucket)).toEqual(['0','0','0','1','1','1'])
    expect(trendPlotData(presentation, { buckets: [] }, 'amount')).toEqual([])
    const zero = { ...bucket(), values: { total: dashboardZero, success: dashboardZero, processing: dashboardZero, failed: dashboardZero, uncategorized: dashboardZero } }
    expect(trendPlotData(presentation, { buckets: [zero] }, 'count').map(({ value }) => value)).toEqual([0,0,0])
    expect(trendPlotData(presentation, { buckets: [zero] }, 'amount').map(({ value }) => value)).toEqual([0,0,0])
  })
  it('rejects overflow only at the numeric plot boundary while preserving original exact money', () => {
    const raw = bucket(), huge = { ...raw, values: { ...raw.values, success: { ...raw.values.success, amount: { ...raw.values.success.amount, minorUnits: '9'.repeat(400) } } } }
    const original = JSON.stringify(huge)
    expect(() => trendPlotData(presentation, { buckets: [huge] }, 'amount')).toThrow()
    expect(JSON.stringify(huge)).toBe(original)
  })
  it('keeps canonical visibility ordering and prevents hiding the final selected series', () => {
    expect(toggleTrendSeries(['success'], 'success')).toEqual(['success'])
    expect(toggleTrendSeries(['failed'], 'success')).toEqual(['success', 'failed'])
  })
})
