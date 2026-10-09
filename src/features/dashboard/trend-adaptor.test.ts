import { createDashboardPresentation } from './presentation'
import { localeMessages } from '@/test/locale-fixture'
const presentation = createDashboardPresentation('uz', localeMessages('dashboard'))
import { nextDate, completedCoverage, dashboardZero } from './test-fixtures'
import { describe, expect, it } from 'vitest'
import type { LineConfig } from '@ant-design/plots'
// Exercise the installed adaptor, including its array mutation and auxiliary
// mark inheritance. Testing only our pre-adaptor config missed this regression.
import { Line } from '@ant-design/plots/es/core/plots/line'
import { adaptor } from '@ant-design/plots/es/core/plots/line/adaptor'
import { mergeWithArrayCoverage } from '@ant-design/plots/es/core/utils/merge-with-array-coverage'
import type { DashboardBucket } from '@/shared/contracts/merchant-read'
import { readMerchantPlotTheme, type MerchantPlotTheme } from './plot-theme'
import { ALL_TREND_SERIES, createTrendPlotConfig, type TrendMode, type TrendPlotDatum, type TrendSeriesKey } from './trend-presentation'

const theme = readMerchantPlotTheme({ fontFamily: 'Inter', getPropertyValue: (name) => name }, false)
const metric = (count: number, minorUnits: string) => ({ count, amount: { minorUnits, currency: 'UZS' as const, scale: 2 as const } })
const buckets: DashboardBucket[] = ['2026-01-01', '2026-05-01', '2026-08-01'].map((date, index) => ({ ...completedCoverage(date, nextDate(date)),
  label: date.slice(0, 7), periodKind: 'calendar', periodStart: date, periodEnd: nextDate(date),
  values: index === 1
    ? { uncategorized: dashboardZero, total: metric(0, '0'), success: metric(0, '0'), processing: metric(0, '0'), failed: metric(0, '0') }
    : { uncategorized: dashboardZero, total: metric(300, '560000000'), success: metric(170, '400000000'), processing: metric(30, '100000000'), failed: metric(100, '60000000') },
}))

type AdaptorOptions = Parameters<typeof adaptor>[0]['options']

// Only the generated mark fields inspected below, rather than the upstream
// union that also permits callback children and non-cartesian specifications.
interface TrendTestMark {
  readonly encode?: { readonly shape?: string }
  readonly style?: { readonly connect?: boolean }
  readonly type?: string
  readonly zIndex?: number
  readonly data?: readonly TrendPlotDatum[]
  readonly scale?: {
    readonly x?: { readonly domain?: readonly string[] }
    readonly y?: { readonly domainMax?: number }
  }
  readonly axis?: { readonly y?: { readonly labelFormatter?: (value: number) => string } }
}

interface TrendTestSpec {
  readonly children?: readonly TrendTestMark[]
  readonly data?: readonly TrendPlotDatum[]
}

function adapt(config: LineConfig): TrendTestSpec {
  // Same defaults/merge as Plot.mergeOption. This pure adaptor does not use chart.
  const options = mergeWithArrayCoverage({}, Line.getDefaultOptions(), config) as AdaptorOptions
  adaptor({ options, chart: {} as Parameters<typeof adaptor>[0]['chart'] })
  return options as unknown as TrendTestSpec
}

describe('trend configuration through the installed Line adaptor', () => {
  it.each(['count', 'amount'] as const)('keeps smooth line/area shapes and canonical zeros/null gaps in %s mode', (mode) => {
    const selected = buckets.map((bucket, index) => index === 2 ? { ...bucket, coverage: 'FUTURE' as const } : bucket)
    const before = JSON.stringify(selected)
    const config = createTrendPlotConfig(presentation, { buckets: selected }, mode, ['success', 'processing', 'failed'], theme)
    const spec = adapt(config)
    expect(spec.children?.map(({ type }) => type)).toEqual(['line', 'area'])
    for (const mark of spec.children!) {
      expect(mark.encode?.shape).toBe('smooth')
      expect(mark.style?.connect).toBe(false)
      const data = mark.data ?? spec.data!
      expect(data).toHaveLength(9)
      expect(data.filter(({ bucket }) => bucket === '1').map(({ value }) => value)).toEqual([0, 0, 0])
      expect(data.filter(({ bucket }) => bucket === '2').map(({ value }) => value)).toEqual([null, null, null])
      expect(data.filter(({ bucket }) => bucket === '0').map(({ value }) => value)).toEqual(mode === 'count'
        ? [170, 30, 100] : [4000000, 1000000, 600000])
      expect(mark.scale?.x?.domain).toEqual(['0', '1', '2'])
    }
    expect(JSON.stringify(selected)).toBe(before)
  })
  it('does not leak generated children into props on Strict Mode replay', () => {
    const config = createTrendPlotConfig(presentation, { buckets }, 'count', ALL_TREND_SERIES, theme)
    const before = JSON.stringify(config)
    const first = adapt(config)
    const replay = adapt(config)
    expect(first.children?.map(({ type }) => type)).toEqual(['line', 'area'])
    expect(replay.children?.map(({ type }) => type)).toEqual(['line', 'area'])
    expect(JSON.stringify(config)).toBe(before)
  })

  it('refreshes every mark domain and formatter across modes, ranges, visibility and themes', () => {
    const sequence: readonly [TrendMode, readonly TrendSeriesKey[], readonly DashboardBucket[], MerchantPlotTheme][] = [
      ['count', ALL_TREND_SERIES, buckets, theme],
      ['amount', ALL_TREND_SERIES, buckets, theme],
      ['amount', ['processing'], buckets.slice(1), { ...theme, dark: true }],
      ['count', ['processing'], buckets.slice(1), theme],
      ['count', ALL_TREND_SERIES, buckets, theme],
      ['amount', ALL_TREND_SERIES, [buckets[1]!], theme],
    ]
    let previous: ReturnType<typeof adapt>['children'] = []
    for (const [mode, visible, selected, selectedTheme] of sequence) {
      const config = createTrendPlotConfig(presentation, { buckets: selected }, mode, visible, selectedTheme)
      const spec = adapt(config)
      expect(spec.children).toHaveLength(2)
      spec.children!.forEach((mark, index) => {
        // G2 updates retain omitted properties. Explicit current options must
        // replace all prior scale/axis settings, including auxiliary marks.
        const merged = mergeWithArrayCoverage({}, previous?.[index], mark) as TrendTestMark
        expect(merged.scale).toEqual(config.scale)
        expect(merged.axis).toEqual(config.axis)
        const maximum = merged.scale?.y?.domainMax
        const data = merged.data ?? spec.data
        const formatter = merged.axis?.y?.labelFormatter
        if (maximum === undefined || !data || !formatter) {
          throw new Error('Expected current data, domain and formatter on every trend mark')
        }
        expect(data.every((datum) => visible.includes(datum.key) && datum.value !== null && datum.value <= maximum)).toBe(true)
        expect(merged.scale!.x!.domain).toHaveLength(selected.length)
        expect(formatter(1)).toBe('1')
      })
      expect(spec.children![0]!.zIndex).toBe(1)
      expect(spec.children![1]!.zIndex).toBe(0)
      previous = spec.children
    }
  })
})
