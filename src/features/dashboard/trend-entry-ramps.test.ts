import { describe, expect, it } from 'vitest'
import type { DashboardBucket } from '@/shared/contracts/merchant-read'
import { ALL_TREND_SERIES, createTrendPlotConfig, trendPlotData } from './trend-presentation'
import { readMerchantPlotTheme } from './plot-theme'
import { createTrendEntryRamps, type RampProjection } from './trend-entry-ramps'

const colors = ['blue', 'green', 'orange', 'red']
function bucket(): DashboardBucket {
  const metric = (count: number, minorUnits: string) => ({ count, amount: { minorUnits, currency: 'UZS' as const, scale: 2 as const } })
  return { label: 'Real date', periodKind: 'calendar', periodStart: '2026-10-01', periodEnd: '2026-10-01',
    values: { total: metric(73, '7300'), success: metric(63, '3150'), processing: metric(1, '200'), failed: metric(9, '900') } }
}
function projection(width = 600, height = 300, single = false): RampProjection {
  return { x: { map: () => single ? 0.5 : 0.03 }, y: { map: (value) => 1 - value / 100 },
    coordinate: { map: ([x, y]) => [x! * width, y! * height] }, offsetX: 40, offsetY: 10 }
}

describe('decorative entry ramp geometry', () => {
  it.each(['count', 'amount'] as const)('connects baseline to each first real %s value without mutating data or domains', (mode) => {
    const view = { buckets: [bucket(), { ...bucket(), label: 'Next real date' }] }
    const original = JSON.stringify(view)
    const theme = readMerchantPlotTheme({ fontFamily: 'Inter', getPropertyValue: (name) => name }, false)
    const config = createTrendPlotConfig(view, mode, ALL_TREND_SERIES, theme)
    const data = trendPlotData(view, mode)
    const before = JSON.stringify(config)
    const ramps = createTrendEntryRamps(data, colors, projection())
    expect(ramps.map(({ key }) => key)).toEqual(ALL_TREND_SERIES)
    expect(ramps.map(({ color }) => color)).toEqual(colors)
    ramps.forEach((ramp, index) => {
      expect(ramp.start).toEqual([40, 310])
      expect(ramp.end[0]).toBeCloseTo(58)
      expect(ramp.end[1]).toBeCloseTo(10 + (1 - data[index]!.value / 100) * 300)
    })
    expect(data).toHaveLength(view.buckets.length * 4)
    expect([...new Set(data.map(({ bucket: key }) => key))]).toEqual(['0', '1'])
    expect(config.scale?.x).toMatchObject({ domain: ['0', '1'], range: [0.03, 0.97] })
    expect(JSON.stringify(view)).toBe(original)
    expect(JSON.stringify(config)).toBe(before)
  })

  it('omits hidden series and zero first values, retaining each visible semantic color', () => {
    const real = bucket()
    const zero = { ...real, values: { ...real.values, processing: { ...real.values.processing, count: 0 } } }
    const ramps = createTrendEntryRamps(trendPlotData({ buckets: [zero] }, 'count', ['success', 'processing']), colors, projection())
    expect(ramps.map(({ key, color }) => [key, color])).toEqual([['success', 'green']])
    expect(createTrendEntryRamps([], colors, projection())).toEqual([])
  })

  it.each([280, 350, 720, 1200])('derives gutter geometry from the rendered projection at width %s', (width) => {
    const ramps = createTrendEntryRamps(trendPlotData({ buckets: [bucket()] }, 'count'), colors, projection(width, 220))
    expect(ramps[0]!.end[0] - ramps[0]!.start[0]).toBeCloseTo(width * 0.03)
    expect(ramps[0]!.start[1]).toBe(230)
    expect(ramps[0]!.end[1]).toBeCloseTo(10 + (1 - 0.73) * 220)
  })

  it('keeps a single centered point unchanged and limits its lead-in to 3% of the coordinate width', () => {
    const data = trendPlotData({ buckets: [bucket()] }, 'count')
    const ramps = createTrendEntryRamps(data, colors, projection(600, 300, true))
    expect(ramps[0]!.end[0]).toBe(340)
    expect(ramps[0]!.end[0] - ramps[0]!.start[0]).toBeCloseTo(18)
    expect(data).toHaveLength(4)
  })

  it('follows new first values and shared scale after data or visibility changes', () => {
    const real = bucket()
    const changed = { ...real, values: { ...real.values, success: { ...real.values.success, count: 20 } } }
    const scaled = { ...projection(), y: { map: (value: number) => 1 - value / 40 } }
    const ramps = createTrendEntryRamps(trendPlotData({ buckets: [changed] }, 'count', ['success']), colors, scaled)
    expect(ramps[0]!.end[1]).toBe(160)
    expect(ramps).toHaveLength(1)
  })
})
