import type { LineConfig } from '@ant-design/plots'
import { safeContractError } from '@/shared/api/errors'
import { plotTooltipInteraction, type MerchantPlotTheme } from './plot-theme'
import type { DashboardBucket, DashboardView, Money } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'

export type TrendMode = 'amount' | 'count'
export const TREND_GROUP_LABELS = {
  HOUR: 'Soatlik', DAY: 'Kunlik', WEEK: 'Haftalik', MONTH: 'Oylik', YEAR: 'Yillik',
} satisfies Record<DashboardView['chartGroupBy'], string>

export const TREND_SERIES = [
  { key: 'total', label: 'Jami', swatch: 'bg-status-info-indicator' },
  { key: 'success', label: 'Muvaffaqiyatli', swatch: 'bg-status-success-indicator' },
  { key: 'processing', label: 'Jarayonda', swatch: 'bg-status-warning-indicator' },
  { key: 'failed', label: 'Muvaffaqiyatsiz', swatch: 'bg-status-error-indicator' },
  { key: 'uncategorized', label: 'Tasniflanmagan', swatch: 'bg-status-neutral-indicator' },
] as const
export type TrendSeriesKey = typeof TREND_SERIES[number]['key']
export const ALL_TREND_SERIES: readonly TrendSeriesKey[] = TREND_SERIES.map(({ key }) => key)
export const DEFAULT_TREND_SERIES: readonly TrendSeriesKey[] = ['success', 'processing', 'failed', 'uncategorized']
type TrendView = Pick<DashboardView, 'buckets'> & Partial<Pick<DashboardView, 'metrics' | 'chartGroupBy'>>

export function availableTrendSeries(view: TrendView): readonly TrendSeriesKey[] {
  const unknown = (view.metrics?.uncategorized.count ?? 0) > 0 ||
    view.buckets.some(({ values }) => values.uncategorized.count > 0 || BigInt(values.uncategorized.amount.minorUnits) > 0n)
  return ALL_TREND_SERIES.filter((key) => key !== 'uncategorized' || unknown)
}
export function visibleTrendSeries(visible: readonly TrendSeriesKey[], available: readonly TrendSeriesKey[]) {
  const selected = available.filter((key) => visible.includes(key))
  return selected.length ? selected : available.filter((key) => DEFAULT_TREND_SERIES.includes(key))
}
export function toggleTrendSeries(visible: readonly TrendSeriesKey[], key: TrendSeriesKey): readonly TrendSeriesKey[] {
  if (visible.includes(key) && visible.length === 1) return visible
  return ALL_TREND_SERIES.filter((item) => item === key ? !visible.includes(item) : visible.includes(item))
}
export function trendSeriesColor(key: TrendSeriesKey, theme: MerchantPlotTheme) {
  return key === 'uncategorized' ? theme.secondary : theme.colors[ALL_TREND_SERIES.indexOf(key)]!
}

// Format the backend's local boundary directly; never apply the browser timezone.
const shortDate = (value: string) => `${value.slice(8, 10)}.${value.slice(5, 7)}`
const fullDate = (value: string) => `${shortDate(value)}.${value.slice(0, 4)}`
const months = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek']
export function trendAxisLabel(bucket: DashboardBucket, group: DashboardView['chartGroupBy']) {
  const start = bucket.periodStart
  if (group === 'HOUR') return `${shortDate(start)} ${start.slice(11, 16)}`
  if (group === 'DAY') return shortDate(start)
  if (group === 'WEEK') return `${shortDate(start)} haftasi`
  if (group === 'MONTH') return `${months[Number(start.slice(5, 7)) - 1]} ${start.slice(0, 4)}`
  return start.slice(0, 4)
}
export function trendPeriodTitle(bucket: DashboardBucket, group: DashboardView['chartGroupBy']) {
  if (group === 'HOUR') {
    const startTime = bucket.periodStart.slice(11, 16)
    const endTime = bucket.periodEnd.slice(11, 16)
    return bucket.periodStart.slice(0, 10) === bucket.periodEnd.slice(0, 10)
      ? `${fullDate(bucket.periodStart)} · ${startTime} ≤ vaqt < ${endTime}`
      : `${fullDate(bucket.periodStart)} ${startTime} ≤ vaqt < ${fullDate(bucket.periodEnd)} ${endTime}`
  }
  if (group === 'DAY') return fullDate(bucket.periodStart)
  if (group === 'WEEK') return `${fullDate(bucket.periodStart)} haftasi`
  return trendAxisLabel(bucket, group)
}
export function trendTickFilter(count: number, width = 720) {
  const budget = Math.max(2, Math.floor(width / 100))
  const step = Math.max(1, Math.ceil((count - 1) / (budget - 1)))
  return (_tick: unknown, index: number) => index === count - 1 || index % step === 0
}
export interface TrendPlotDatum {
  readonly bucket: string
  readonly period: string
  readonly title: string
  readonly key: TrendSeriesKey
  readonly type: string
  readonly value: number | null
  readonly count: number
  readonly amount: Money
  readonly exactValue: string
  readonly coverage: DashboardBucket['coverage']
  readonly partial: boolean
  readonly interval: string
}

// Approximate numbers only at the engine boundary; tooltips retain exact money.
export function trendPlotData(view: TrendView, mode: TrendMode, visible: readonly TrendSeriesKey[] = DEFAULT_TREND_SERIES): TrendPlotDatum[] {
  const selected = visibleTrendSeries(visible, availableTrendSeries(view))
  return view.buckets.flatMap((bucket, index) => TREND_SERIES.filter(({ key }) => selected.includes(key)).map((item) => {
    const raw = bucket.values[item.key]
    const observedValue = mode === 'amount' ? Number(raw.amount.minorUnits) / 10 ** raw.amount.scale : raw.count
    if (!Number.isFinite(observedValue)) throw safeContractError()
    return { bucket: String(index), period: bucket.label, title: trendPeriodTitle(bucket, view.chartGroupBy ?? 'DAY'),
      key: item.key, type: item.label, value: bucket.coverage === 'FUTURE' ? null : observedValue,
      count: raw.count, amount: raw.amount, coverage: bucket.coverage, partial: bucket.partial || bucket.coverage === 'PARTIAL',
      interval: `${bucket.periodStart} ≤ vaqt < ${bucket.periodEnd}`,
      exactValue: bucket.coverage === 'FUTURE' ? 'Hali kuzatilmagan' : mode === 'amount' ? formatMoney(raw.amount) : raw.count.toLocaleString('uz-UZ') }
  }))
}
export function trendTooltipItem(datum: TrendPlotDatum) {
  return { name: datum.type, value: datum.exactValue }
}
export function createTrendPlotConfig(view: TrendView, mode: TrendMode, visible: readonly TrendSeriesKey[], theme: MerchantPlotTheme, width = 720): LineConfig {
  const data = trendPlotData(view, mode, visible)
  const available = TREND_SERIES.filter(({ key }) => availableTrendSeries(view).includes(key))
  const maximum = data.reduce((max, datum) => Math.max(max, datum.value ?? 0), 0)
  const scale: LineConfig['scale'] = {
    x: { type: 'point', domain: view.buckets.map((_, index) => String(index)), range: [0.02, 0.98] },
    y: { domainMin: 0, domainMax: mode === 'count' ? Math.max(4, Math.ceil(maximum / 4) * 4) : maximum || 1, tickCount: 5, nice: true },
    color: { domain: available.map(({ label }) => label), range: available.map(({ key }) => trendSeriesColor(key, theme)) },
  }
  const axis: LineConfig['axis'] = {
    x: { title: false, labelFill: theme.secondary, labelFontSize: 12, line: true, lineStroke: theme.axis, tick: false,
      tickFilter: trendTickFilter(view.buckets.length, width), labelAutoRotate: false,
      labelAutoHide: true,
      labelFormatter: (value: string) => view.buckets[Number(value)] ? trendAxisLabel(view.buckets[Number(value)]!, view.chartGroupBy ?? 'DAY') : value },
    y: { title: false, labelFill: theme.secondary, labelFontSize: 12, grid: true, gridStroke: theme.grid,
      gridStrokeOpacity: 0.35, gridLineDash: [3, 3], line: false, tick: false,
      labelFormatter: (value: number) => Number(value).toLocaleString('uz-UZ', mode === 'amount'
        ? { maximumFractionDigits: 2, notation: 'compact' } : { maximumFractionDigits: 0 }) },
  }
  return {
    data, autoFit: true, height: 320, theme: theme.dark ? 'classicDark' : 'classic',
    xField: 'bucket', yField: 'value', colorField: 'type', shapeField: 'line',
    style: { lineWidth: 2.5 }, zIndex: 1,
    // No permanent point mark; the native tooltip interaction owns active markers.
    // Explicit auxiliary axis/scale prevents G2 retaining a previous mode's domain.
    area: { data: data.filter(({ key }) => key !== 'total'), shapeField: 'area', tooltip: false, zIndex: 0, scale, axis,
      style: { fillOpacity: 0.07, strokeOpacity: 0, lineWidth: 0 } },
    scale, axis, legend: false,
    tooltip: { title: (datum: TrendPlotDatum) => `${datum.title}${datum.coverage === 'FUTURE' ? ' · Hali kuzatilmagan' : datum.partial ? ' · Qisman davr' : ''}`,
      items: [(datum: TrendPlotDatum) => ({ ...trendTooltipItem(datum), color: trendSeriesColor(datum.key, theme) })] },
    interaction: { tooltip: { shared: true, series: true, wait: 0, trailing: false, crosshairsX: true, crosshairsY: false, marker: true,
      sort: (item: { name: string }) => TREND_SERIES.findIndex(({ label }) => label === item.name),
      ...plotTooltipInteraction(theme, true), style: { markerR: 4, markerLineWidth: 2, markerStroke: theme.surface,
        crosshairsStroke: theme.axis, crosshairsLineWidth: 1, crosshairsStrokeOpacity: 0.6 } } },
  }
}
