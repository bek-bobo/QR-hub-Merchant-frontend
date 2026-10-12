import { useDashboardPresentation } from './presentation'
import { TrendPlotViewport } from './TrendPlotViewport'
import { useMerchantPlotTheme } from './plot-theme'
import { useMemo, useState, type ReactNode } from 'react'
import { ChartNoAxesColumnIncreasingIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardView } from '@/shared/contracts/merchant-read'

import { availableTrendSeries, visibleTrendSeries, createTrendPlotConfig, trendPlotData, trendInteractionKey, trendPeriodTitle, TREND_GROUP_KEYS, TREND_SERIES, type TrendMode } from './trend-presentation'
import { TrendSeriesSettings } from './TrendSeriesSettings'
import { useTrendSeriesPreferences } from './useTrendSeriesPreferences'

interface TrendChartProps {
  readonly view: DashboardView
  readonly granularityControls?: ReactNode
  readonly periodLabel?: ReactNode
  readonly feedback?: ReactNode
  readonly plotUnavailable?: boolean
}

export function TrendChart({ view, granularityControls, periodLabel, feedback, plotUnavailable = false }: TrendChartProps) {
  const p = useDashboardPresentation()
  const [mode, setMode] = useState<TrendMode>('count')
  const { buckets, chartGroupBy } = view
  const uncategorizedCount = view.metrics.uncategorized.count
  const available = useMemo(() => availableTrendSeries({ buckets, metrics: { uncategorized: { count: uncategorizedCount } } }), [buckets, uncategorizedCount])
  const preferences = useTrendSeriesPreferences(undefined, available)
  const visible = visibleTrendSeries(preferences.visible, available)
  const toggle = preferences.toggle
  const theme = useMerchantPlotTheme()
  // A tiny canonical series string is a dependency, not an array identity.
  const seriesKey = visible.join(',')
  const prepared = useMemo(() => {
    const selected = TREND_SERIES.map(({ key }) => key).filter((key) => seriesKey.split(',').includes(key))
    const data = plotUnavailable ? [] : trendPlotData(p, { buckets, chartGroupBy }, mode, selected, available)
    return { data, available, selected, interactionKey: trendInteractionKey(buckets, chartGroupBy, mode, selected, data) }
  }, [buckets, chartGroupBy, mode, seriesKey, available, plotUnavailable, p])
  const config = useMemo(() => theme && !plotUnavailable && buckets.length ? createTrendPlotConfig(p, { buckets, chartGroupBy }, mode, prepared.selected, theme, 720, prepared) : null, [buckets, chartGroupBy, mode, theme, prepared, plotUnavailable, p])

  return (
    <Card className="dashboard-trend min-w-0 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(5)]">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><ChartNoAxesColumnIncreasingIcon className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
          <CardTitle>{p.message('trend.title')}</CardTitle>
          <p className="mt-1 text-xs text-text-secondary">{p.message(mode === 'amount' ? 'trend.amountUnit' : 'trend.countUnit')}</p>
          {periodLabel}
          {!plotUnavailable ? <p className="mt-1 text-xs text-text-secondary">{p.message('trend.grouping', {group: p.message(TREND_GROUP_KEYS[view.chartGroupBy])})}</p> : null}
          </div>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-start gap-2">
          {granularityControls}
          <div role="group" aria-label={p.message('trend.mode')} className="flex max-w-full flex-wrap gap-0.5 rounded-lg bg-muted/60 p-0.5">
            {(['amount', 'count'] as const).map((option) => (
              <Button key={option} type="button" variant="outline" size="sm"
                aria-pressed={mode === option}
                className="rounded-lg border-transparent bg-transparent shadow-none dark:bg-transparent aria-pressed:border-brand/20 aria-pressed:bg-brand-soft aria-pressed:text-brand aria-pressed:font-semibold dark:aria-pressed:bg-brand-soft"
                onClick={() => { setMode(option) }}>
                {p.message(option === 'amount' ? 'trend.amount' : 'trend.count')}
              </Button>
            ))}
          </div>
          <TrendSeriesSettings visible={visible} available={available} onToggle={toggle} />
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5">
        {feedback}
        {plotUnavailable ? null : view.buckets.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-text-secondary">
            {p.message('trend.empty')}
          </p>
        ) : (
          <div className="min-w-0 w-full">
            {config ? (
              <TrendPlotViewport config={config} interactionKey={prepared.interactionKey} />
            )
              : <div className="h-80" />}
          </div>
        )}
        <ul aria-label={p.message('trend.series')} className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-secondary">
          {TREND_SERIES.filter((item) => visible.includes(item.key)).map((item) => (
            <li key={item.key} className="flex items-center gap-2 py-1">
              <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${item.swatch}`} />
              <span>{p.label(item.key)}{!plotUnavailable ? ` (${mode === 'amount' ? p.money(view.metrics[item.key].amount) : p.number(view.metrics[item.key].count)})` : ''}</span>
            </li>
          ))}
        </ul>
        {!plotUnavailable && view.buckets.length > 0 ? (
          <section className="sr-only" aria-label={p.message('trend.exactTitle')}>
            <p>{p.message('trend.exactDescription')}</p>
            <ul>
              {view.buckets.map((bucket, index) => (
                <li key={`${bucket.label}-${index}`}>
                  {trendPeriodTitle(p, bucket, chartGroupBy)}: {bucket.coverage === 'FUTURE' ? p.message('trend.future') : <>
                    {bucket.partial || bucket.coverage === 'PARTIAL' ? p.message('trend.partial') : ''}{TREND_SERIES.filter(({ key }) => available.includes(key)).map((item) =>
                    p.message('trend.exactItem', {label: p.label(item.key), countText: p.number(bucket.values[item.key].count), amount: p.money(bucket.values[item.key].amount)})).join('; ')}</>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
