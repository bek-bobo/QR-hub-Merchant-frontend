import { describe, expect, it } from 'vitest'
import type { DashboardBucket } from '@/shared/contracts/merchant-read'
import { ALL_TREND_SERIES, createTrendPlotConfig, toggleTrendSeries, trendPlotData, trendTooltipItem } from './trend-presentation'
import { readMerchantPlotTheme } from './plot-theme'

const theme = readMerchantPlotTheme({ fontFamily: 'Inter', getPropertyValue: (name) => name }, false)
function bucket(label: string): DashboardBucket {
  const metric = (count: number, minorUnits: string) => ({ count, amount: { minorUnits, currency: 'UZS' as const, scale: 2 as const } })
  return { label, periodKind: 'calendar', periodStart: '2026-10-01', periodEnd: '2026-10-01', values: {
    total: metric(99, '900719925474099301'), success: metric(3, '12345'), processing: metric(1, '1'), failed: metric(7, '8000000'),
  } }
}

describe('Merchant trend plot adapter', () => {
  it('insets both real endpoints without adding buckets, labels or zero values', () => {
    const view = { buckets: [bucket('First'), bucket('Last')] }
    const config = createTrendPlotConfig(view, 'count', ALL_TREND_SERIES, theme)
    expect(config.scale).toMatchObject({ x: { type: 'point', range: [0.03, 0.97], domain: ['0', '1'] },
      y: { domainMin: 0 } })
    const data = config.data as ReturnType<typeof trendPlotData>
    expect(data).toHaveLength(view.buckets.length * ALL_TREND_SERIES.length)
    expect([...new Set(data.map(({ bucket }) => bucket))]).toHaveLength(view.buckets.length)
    expect([...new Set(data.map(({ period }) => period))]).toEqual(['First', 'Last'])
    expect(data[0]!.value).toBe(view.buckets[0]!.values.total.count)
    expect(data[4]!.value).toBe(view.buckets[1]!.values.total.count)
    expect(data.every(({ value }) => value > 0)).toBe(true)
  })

  it.each(['count', 'amount'] as const)('maps four exact raw series in stable order for %s', (mode) => {
    const view = { buckets: [bucket('A'), bucket('B')] }
    const original = JSON.stringify(view)
    const data = trendPlotData(view, mode)
    expect(data.map(({ key }) => key)).toEqual([...ALL_TREND_SERIES, ...ALL_TREND_SERIES])
    expect(data.slice(0, 4).map(({ type }) => type)).toEqual(['Jami', 'Muvaffaqiyatli', 'Jarayonda', 'Muvaffaqiyatsiz'])
    expect(data.slice(0, 4).map(({ value }) => value)).toEqual(mode === 'count' ? [99, 3, 1, 7] : [Number('900719925474099301') / 100, 123.45, 0.01, 80000])
    expect(data[0]!.amount.minorUnits).toBe('900719925474099301')
    expect(data.every(({ value }) => Number.isFinite(value))).toBe(true)
    expect(trendTooltipItem(data[0]!).value).toBe(mode === 'count' ? '99' : '9 007 199 254 740 993.01 UZS')
    expect(trendTooltipItem(data[2]!).value).toBe(mode === 'count' ? '1' : '0.01 UZS')
    expect(JSON.stringify(view)).toBe(original)
  })

  it.each(['count', 'amount'] as const)('filters hidden series and derives the shared %s scale from visible data', (mode) => {
    const view = { buckets: [bucket('A')] }
    const config = createTrendPlotConfig(view, mode, ['success', 'processing'], theme)
    const data = trendPlotData(view, mode, ['success', 'processing'])
    expect(data.map(({ key }) => key)).toEqual(['success', 'processing'])
    expect(data.map(trendTooltipItem).map(({ name }) => name)).toEqual(['Muvaffaqiyatli', 'Jarayonda'])
    expect(config.scale).toMatchObject({ y: { domainMin: 0, domainMax: mode === 'count' ? 4 : 123.45 } })
    expect(config.scale).toMatchObject({ color: { domain: ['Jami', 'Muvaffaqiyatli', 'Jarayonda', 'Muvaffaqiyatsiz'],
      range: ['--status-info-indicator', '--status-success-indicator', '--status-warning-indicator', '--status-error-indicator'] } })
    expect(config).toMatchObject({ autoFit: true, shapeField: 'smooth', legend: false,
      interaction: { tooltip: { shared: true, series: true, crosshairsX: true } } })
  })

  it('includes status-only areas and a native tooltip formatter while keeping Total line-only', () => {
    const config = createTrendPlotConfig({ buckets: [bucket('A')] }, 'amount', ALL_TREND_SERIES, theme)
    const areas = config.area?.data as ReturnType<typeof trendPlotData>
    expect(areas.map(({ key }) => key)).toEqual(['success', 'processing', 'failed'])
    expect(config.area).toMatchObject({ tooltip: false, zIndex: 0,
      style: { fillOpacity: 1, opacity: 1, strokeOpacity: 0 } })
    expect(config.children).toBeUndefined()
    expect(config).toMatchObject({ zIndex: 1 })
    expect(config.point).toMatchObject({ zIndex: 2 })
    const dark = createTrendPlotConfig({ buckets: [bucket('A')] }, 'count', ALL_TREND_SERIES, { ...theme, dark: true })
    expect(dark.area).toMatchObject({ style: { fillOpacity: 1, opacity: 1 } })
    expect(dark.theme).toBe('classicDark')
  })

  it.each([false, true])('uses opaque semantic area tints below unchanged lines/markers (dark=%s)', (dark) => {
    const resolved = readMerchantPlotTheme({ fontFamily: 'Inter', getPropertyValue: (name) => `${name}:${dark}` }, dark)
    const view = { buckets: [bucket('A'), bucket('B')] }
    const original = JSON.stringify(view)
    const config = createTrendPlotConfig(view, 'count', ALL_TREND_SERIES, resolved)
    const areas = config.area?.data as ReturnType<typeof trendPlotData>
    const fill = config.area?.style?.fill as (datum: ReturnType<typeof trendPlotData>[number] | ReturnType<typeof trendPlotData>) => string
    for (const [key, role] of [['success', 'success'], ['processing', 'warning'], ['failed', 'error']] as const) {
      const series = areas.filter((datum) => datum.key === key)
      expect(fill(series)).toBe(`--status-${role}-background:${dark}`)
      expect(fill(series[0]!)).toBe(resolved.areaTints[key])
    }
    expect(areas.some(({ key }) => key === 'total')).toBe(false)
    expect(config.area).toMatchObject({ zIndex: 0, style: { fillOpacity: 1, opacity: 1 } })
    expect(config.children).toBeUndefined()
    expect(config).toMatchObject({ zIndex: 1 })
    expect(config.point).toMatchObject({ zIndex: 2, sizeField: 2 })
    expect(config.scale?.color).toMatchObject({ range: resolved.colors })
    expect(config.scale?.x).toMatchObject({ range: [0.03, 0.97], domain: ['0', '1'] })
    expect(config.data).toEqual(trendPlotData(view, 'count'))
    expect(config.area?.data).toEqual(trendPlotData(view, 'count').filter(({ key }) => key !== 'total'))
    expect(config.stack).toBeUndefined()
    expect(config.normalize).toBeUndefined()
    expect(JSON.stringify(view)).toBe(original)
    const hidden = createTrendPlotConfig(view, 'amount', ['processing'], resolved)
    const area = hidden.area
    expect(area).toBeDefined()
    if (!area) throw new Error('Expected the visible Processing series to have an area')
    expect((area.data as ReturnType<typeof trendPlotData>).every(({ key }) => key === 'processing')).toBe(true)
  })

  it('preserves duplicate backend labels as separate buckets and handles empty/single/zero inputs', () => {
    const duplicate = trendPlotData({ buckets: [bucket('same'), bucket('same')] }, 'count')
    expect([...new Set(duplicate.map(({ bucket }) => bucket))]).toEqual(['0', '1'])
    expect(duplicate.every(({ period }) => period === 'same')).toBe(true)
    expect(trendPlotData({ buckets: [] }, 'amount')).toEqual([])
    const zero = bucket('zero')
    const zeros = { ...zero, values: Object.fromEntries(ALL_TREND_SERIES.map((key) => [key, { count: 0,
      amount: { minorUnits: '0', currency: 'UZS', scale: 2 } }])) as DashboardBucket['values'] }
    for (const mode of ['count', 'amount'] as const) {
      expect(trendPlotData({ buckets: [zeros] }, mode).map(({ value }) => value)).toEqual([0, 0, 0, 0])
      expect(createTrendPlotConfig({ buckets: [zeros] }, mode, ALL_TREND_SERIES, theme).scale).toMatchObject({ y: { domainMax: mode === 'count' ? 4 : 1 } })
    }
  })

  it('rejects unrepresentable plot amounts instead of passing Infinity to the engine', () => {
    const base = bucket('Overflow')
    const huge = { ...base, values: { ...base.values, total: { ...base.values.total,
      amount: { ...base.values.total.amount, minorUnits: '9'.repeat(400) } } } }
    const original = JSON.stringify(huge)
    expect(() => trendPlotData({ buckets: [huge] }, 'amount')).toThrow()
    expect(JSON.stringify(huge)).toBe(original)
  })

  it('restores legend order and cannot hide the final series', () => {
    const hidden = toggleTrendSeries(ALL_TREND_SERIES, 'total')
    expect(hidden).toEqual(['success', 'processing', 'failed'])
    expect(toggleTrendSeries(hidden, 'total')).toEqual(ALL_TREND_SERIES)
    expect(toggleTrendSeries(['success'], 'success')).toEqual(['success'])
  })
})
