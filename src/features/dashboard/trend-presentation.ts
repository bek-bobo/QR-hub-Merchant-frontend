import type { DashboardPresentation } from './presentation'
import type { LineConfig } from '@ant-design/plots'
import { safeContractError } from '@/shared/api/errors'
import { plotTooltipInteraction, type MerchantPlotTheme } from './plot-theme'
import type { DashboardBucket, DashboardView, Money } from '@/shared/contracts/merchant-read'


export type TrendMode = 'amount' | 'count'
export const TREND_GROUP_KEYS = { HOUR: 'granularity.groupHOUR', DAY: 'granularity.groupDAY', WEEK: 'granularity.groupWEEK', MONTH: 'granularity.groupMONTH', YEAR: 'granularity.groupYEAR' } as const satisfies Record<DashboardView['chartGroupBy'], string>

export const TREND_SERIES = [
  { key: 'total', labelKey: 'metrics.total', swatch: 'bg-status-info-indicator' },
  { key: 'success', labelKey: 'metrics.success', swatch: 'bg-status-success-indicator' },
  { key: 'processing', labelKey: 'metrics.processing', swatch: 'bg-status-warning-indicator' },
  { key: 'failed', labelKey: 'metrics.failed', swatch: 'bg-status-error-indicator' },
  { key: 'uncategorized', labelKey: 'metrics.uncategorized', swatch: 'bg-status-neutral-indicator' },
] as const
export type TrendSeriesKey = typeof TREND_SERIES[number]['key']
export const ALL_TREND_SERIES: readonly TrendSeriesKey[] = TREND_SERIES.map(({ key }) => key)
export const DEFAULT_TREND_SERIES: readonly TrendSeriesKey[] = ['success', 'processing', 'failed', 'uncategorized']
type TrendView = Pick<DashboardView, 'buckets'> & Partial<Pick<DashboardView, 'metrics' | 'chartGroupBy'>>

export function availableTrendSeries(view: Pick<TrendView, 'buckets'> & { readonly metrics?: { readonly uncategorized: { readonly count: number } } }): readonly TrendSeriesKey[] {
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
export function trendAxisLabel(p: DashboardPresentation, bucket: DashboardBucket, group: DashboardView['chartGroupBy']) {
 const start=bucket.periodStart
 const short=p.date(start,{day:'2-digit',month:'2-digit'})
 if(group==='HOUR') return `${short} ${start.slice(11,16)}`
 if(group==='DAY') return short
 if(group==='WEEK') return p.message('dates.week',{date:short})
 if(group==='MONTH') return p.month(start)
 return start.slice(0,4)
}
export function trendPeriodTitle(p: DashboardPresentation, bucket: DashboardBucket, group: DashboardView['chartGroupBy']) {
 if(group==='HOUR') {
  const start=bucket.periodStart.slice(11,16), end=bucket.periodEnd.slice(11,16)
  return bucket.periodStart.slice(0,10)===bucket.periodEnd.slice(0,10)
   ? p.message('dates.hourSame',{date:p.date(bucket.periodStart),start,end})
   : p.message('dates.hourAcross',{startDate:p.date(bucket.periodStart),endDate:p.date(bucket.periodEnd),start,end})
 }
 if(group==='DAY') return p.date(bucket.periodStart)
 if(group==='WEEK') return p.message('dates.week',{date:p.date(bucket.periodStart)})
 return trendAxisLabel(p,bucket,group)
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
export function trendPlotData(p: DashboardPresentation, view: TrendView, mode: TrendMode, visible: readonly TrendSeriesKey[] = DEFAULT_TREND_SERIES, available = availableTrendSeries(view)): TrendPlotDatum[] {
  const selected = visibleTrendSeries(visible, available)
  const series = TREND_SERIES.filter(({ key }) => selected.includes(key))
  return view.buckets.flatMap((bucket, index) => series.map((item) => {
    const raw = bucket.values[item.key]
    const observedValue = mode === 'amount' ? Number(raw.amount.minorUnits) / 10 ** raw.amount.scale : raw.count
    if (!Number.isFinite(observedValue)) throw safeContractError()
    return { bucket: String(index), period: bucket.label, title: trendPeriodTitle(p, bucket, view.chartGroupBy ?? 'DAY'),
      key: item.key, type: p.label(item.key), value: bucket.coverage === 'FUTURE' ? null : observedValue,
      count: raw.count, amount: raw.amount, coverage: bucket.coverage, partial: bucket.partial || bucket.coverage === 'PARTIAL',
      interval: p.message('dates.interval', { start: bucket.periodStart, end: bucket.periodEnd }),
      exactValue: bucket.coverage === 'FUTURE' ? p.message('trend.future') : mode === 'amount' ? p.money(raw.amount) : p.number(raw.count) }
  }))
}
export function trendTooltipItem(datum: TrendPlotDatum) {
  return { name: datum.type, value: datum.exactValue, seriesKey: datum.key }
}
// Ordered boundaries identify keyboard positions. Changed displayed content
// resets safely rather than leaving an asynchronously updated tooltip stale.
// Build this alongside prepared data, not by comparing whole views each render.
export function trendInteractionKey(buckets: readonly DashboardBucket[], group: DashboardView['chartGroupBy'], mode: TrendMode, visible: readonly TrendSeriesKey[], data: readonly TrendPlotDatum[]) {
  const field = (value: string) => `${value.length}:${value}`
  const boundaries = buckets.map((bucket) => `${field(bucket.periodKind)}${field(bucket.periodStart)}${field(bucket.periodEnd)}`)
  const content = data.map((datum) => `${field(datum.amount.minorUnits)}${field(String(datum.count))}${field(datum.coverage)}${field(String(datum.partial))}`)
  return [group, mode, ...visible, ...boundaries, ...content].map(field).join('')
}

export function createTrendPlotConfig(p: DashboardPresentation, view: TrendView, mode: TrendMode, visible: readonly TrendSeriesKey[], theme: MerchantPlotTheme, width = 720,
  prepared?: { readonly data: TrendPlotDatum[]; readonly available: readonly TrendSeriesKey[] }): LineConfig {
  const availableKeys = prepared?.available ?? availableTrendSeries(view)
  const data = prepared?.data ?? trendPlotData(p, view, mode, visible, availableKeys)
  const available = TREND_SERIES.filter(({ key }) => availableKeys.includes(key))
  const maximum = data.reduce((max, datum) => Math.max(max, datum.value ?? 0), 0)
  const scale: LineConfig['scale'] = {
    x: { type: 'point', domain: view.buckets.map((_, index) => String(index)), range: [0.02, 0.98] },
    y: { domainMin: 0, domainMax: mode === 'count' ? Math.max(4, Math.ceil(maximum / 4) * 4) : maximum || 1, tickCount: 5, nice: true },
    color: { domain: available.map(({ key }) => key), range: available.map(({ key }) => trendSeriesColor(key, theme)) },
  }
  const axis: LineConfig['axis'] = {
    x: { title: false, labelFill: theme.secondary, labelFontSize: 12, line: true, lineStroke: theme.axis, tick: false,
      tickFilter: trendTickFilter(view.buckets.length, width), labelAutoRotate: false,
      labelAutoHide: true,
      labelFormatter: (value: string) => view.buckets[Number(value)] ? trendAxisLabel(p, view.buckets[Number(value)]!, view.chartGroupBy ?? 'DAY') : value },
    y: { title: false, labelFill: theme.secondary, labelFontSize: 12, grid: true, gridStroke: theme.grid,
      gridStrokeOpacity: 0.35, gridLineDash: [3, 3], line: false, tick: false,
      labelFormatter: (value: number) => p.number(Number(value), mode === 'amount'
        ? { maximumFractionDigits: 2, notation: 'compact' } : { maximumFractionDigits: 0 }) },
  }
  return {
    data, autoFit: true, height: 320, theme: theme.dark ? 'classicDark' : 'classic',
    xField: 'bucket', yField: 'value', colorField: 'key', shapeField: 'smooth',
    // Native Cartesian smooth shapes use monotone-X curves without overshoot.
    style: { lineWidth: 2.5, connect: false }, zIndex: 1,
    // No permanent point mark; the native tooltip interaction owns active markers.
    // Explicit auxiliary axis/scale prevents G2 retaining a previous mode's domain.
    area: { data: data.filter(({ key }) => key !== 'total'), shapeField: 'smooth', tooltip: false, zIndex: 0, scale, axis,
      style: { fillOpacity: 0.07, strokeOpacity: 0, lineWidth: 0, connect: false } },
    scale, axis, legend: false,
    tooltip: { title: (datum: TrendPlotDatum) => datum.coverage === 'FUTURE' || datum.partial ? p.message('trend.coverageTitle', { title: datum.title, coverage: p.message(datum.coverage === 'FUTURE' ? 'trend.future' : 'trend.partial') }) : datum.title,
      items: [(datum: TrendPlotDatum) => ({ ...trendTooltipItem(datum), color: trendSeriesColor(datum.key, theme) })] },
    interaction: { tooltip: { shared: true, series: true, wait: 0, trailing: false, crosshairsX: true, crosshairsY: false, marker: true,
      sort: (item: { seriesKey: TrendSeriesKey }) => ALL_TREND_SERIES.indexOf(item.seriesKey),
      ...plotTooltipInteraction(theme, true), style: { markerR: 4, markerLineWidth: 2, markerStroke: theme.surface,
        crosshairsStroke: theme.axis, crosshairsLineWidth: 1, crosshairsStrokeOpacity: 0.6 } } },
  }
}
