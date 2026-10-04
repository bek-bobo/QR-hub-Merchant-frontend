import type { LineConfig } from '@ant-design/plots'
import { safeContractError } from '@/shared/api/errors'
import { plotTooltipInteraction, type MerchantPlotTheme } from './plot-theme'
import type { DashboardView, Money } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'

export type TrendMode = 'amount' | 'count'
export const TREND_GROUP_LABELS = {
  HOUR: 'Soatlik', DAY: 'Kunlik', WEEK: 'Haftalik', MONTH: 'Oylik', YEAR: 'Yillik',
} satisfies Record<DashboardView['chartGroupBy'], string>

export const TREND_SERIES = [
  { key: 'total', label: 'Jami', stroke: 'stroke-status-info-indicator', fill: 'fill-status-info-indicator', swatch: 'bg-status-info-indicator', dash: undefined },
  { key: 'success', label: 'Muvaffaqiyatli', stroke: 'stroke-status-success-indicator', fill: 'fill-status-success-indicator', swatch: 'bg-status-success-indicator', dash: undefined },
  { key: 'processing', label: 'Jarayonda', stroke: 'stroke-status-warning-indicator', fill: 'fill-status-warning-indicator', swatch: 'bg-status-warning-indicator', dash: '6 3' },
  { key: 'failed', label: 'Muvaffaqiyatsiz', stroke: 'stroke-status-error-indicator', fill: 'fill-status-error-indicator', swatch: 'bg-status-error-indicator', dash: '3 3' },
] as const

export type TrendSeriesKey = typeof TREND_SERIES[number]['key']
export const ALL_TREND_SERIES: readonly TrendSeriesKey[] = TREND_SERIES.map(({ key }) => key)

export function toggleTrendSeries(visible: readonly TrendSeriesKey[], key: TrendSeriesKey): readonly TrendSeriesKey[] {
  if (visible.includes(key) && visible.length === 1) return visible
  return ALL_TREND_SERIES.filter((item) => item === key ? !visible.includes(item) : visible.includes(item))
}

export interface TrendPlotDatum {
  readonly bucket: string
  readonly period: string
  readonly key: TrendSeriesKey
  readonly type: string
  readonly value: number
  readonly count: number
  readonly amount: Money
  readonly exactValue: string
}

// Numeric values belong to the plot boundary only. Original money stays exact.
export function trendPlotData(view: Pick<DashboardView, 'buckets'>, mode: TrendMode, visible: readonly TrendSeriesKey[] = ALL_TREND_SERIES): TrendPlotDatum[] {
  return view.buckets.flatMap((bucket, index) => TREND_SERIES.filter(({ key }) => visible.includes(key)).map((item) => {
    const raw = bucket.values[item.key]
    const value = mode === 'amount' ? Number(raw.amount.minorUnits) / 10 ** raw.amount.scale : raw.count
    if (!Number.isFinite(value)) throw safeContractError()
    return { bucket: String(index), period: bucket.label, key: item.key, type: item.label, value,
      count: raw.count, amount: raw.amount,
      exactValue: mode === 'amount' ? formatMoney(raw.amount) : raw.count.toLocaleString('uz-UZ') }
  }))
}

export function trendTooltipItem(datum: TrendPlotDatum) {
  return { name: datum.type, value: datum.exactValue }
}

export function createTrendPlotConfig(view: Pick<DashboardView, 'buckets'>, mode: TrendMode, visible: readonly TrendSeriesKey[], theme: MerchantPlotTheme): LineConfig {
  const data = trendPlotData(view, mode, visible)
  const maximum = data.reduce((max, datum) => Math.max(max, datum.value), 0)
  return {
    data, autoFit: true, height: 320, theme: theme.dark ? 'classicDark' : 'classic',
    xField: 'bucket', yField: 'value', colorField: 'type', shapeField: 'smooth',
    style: { lineWidth: 2 },
    // The Line adaptor appends auxiliary marks; mark-level zIndex keeps every
    // line/marker above the opaque areas regardless of child insertion order.
    children: [{ type: 'line', zIndex: 1 }],
    point: { sizeField: 2, tooltip: false, zIndex: 2 },
    area: { data: data.filter(({ key }) => key !== 'total'), shapeField: 'smooth', tooltip: false, zIndex: 0,
      style: {
        // G2 supplies the full series to area style callbacks.
        fill: (datum: TrendPlotDatum | TrendPlotDatum[]) => {
          const key = (Array.isArray(datum) ? datum[0] : datum)?.key
          return key && key !== 'total' ? theme.areaTints[key] : theme.surface
        },
        fillOpacity: 1, opacity: 1, strokeOpacity: 0, lineWidth: 0,
      } },
    scale: {
      x: { type: 'point', domain: view.buckets.map((_, index) => String(index)), range: [0.03, 0.97] },
      y: { domainMin: 0, domainMax: mode === 'count' ? Math.max(4, Math.ceil(maximum / 4) * 4) : maximum || 1, tickCount: 5, nice: true },
      color: { domain: TREND_SERIES.map(({ label }) => label), range: [...theme.colors] },
    },
    axis: {
      x: { title: false, labelFill: theme.secondary, labelFontSize: 11, line: true, lineStroke: theme.axis, tick: false,
        labelFormatter: (value: string) => view.buckets[Number(value)]?.label ?? value },
      y: { title: false, labelFill: theme.secondary, labelFontSize: 11, grid: true, gridStroke: theme.grid,
        gridStrokeOpacity: 0.4, gridLineDash: [0, 0], line: false, tick: false,
        labelFormatter: (value: number) => Number(value).toLocaleString('uz-UZ', mode === 'amount'
          ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 }) + (mode === 'amount' ? ' UZS' : '') },
    },
    // Merchant series settings own visibility and the last-series guard.
    legend: false,
    tooltip: { title: (datum: TrendPlotDatum) => datum.period, items: [
      (datum: TrendPlotDatum) => ({ ...trendTooltipItem(datum), color: theme.colors[ALL_TREND_SERIES.indexOf(datum.key)] }),
    ] },
    interaction: { tooltip: { shared: true, series: true, crosshairsX: true, crosshairsY: false,
      marker: true, ...plotTooltipInteraction(theme), style: { crosshairsStroke: theme.axis, crosshairsLineWidth: 1, crosshairsStrokeOpacity: 0.6 } } },
  }
}
