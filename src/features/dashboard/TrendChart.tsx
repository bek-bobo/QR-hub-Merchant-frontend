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
import { formatMoney } from '@/shared/money/minor'
import { availableTrendSeries, visibleTrendSeries, createTrendPlotConfig, trendPlotData, trendInteractionKey, TREND_GROUP_LABELS, TREND_SERIES, type TrendMode } from './trend-presentation'
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
    const data = plotUnavailable ? [] : trendPlotData({ buckets, chartGroupBy }, mode, selected, available)
    return { data, available, selected, interactionKey: trendInteractionKey(buckets, chartGroupBy, mode, selected, data) }
  }, [buckets, chartGroupBy, mode, seriesKey, available, plotUnavailable])
  const config = useMemo(() => theme && !plotUnavailable && buckets.length ? createTrendPlotConfig({ buckets, chartGroupBy }, mode, prepared.selected, theme, 720, prepared) : null, [buckets, chartGroupBy, mode, theme, prepared, plotUnavailable])

  return (
    <Card className="dashboard-trend min-w-0 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(5)]">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><ChartNoAxesColumnIncreasingIcon className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
          <CardTitle>Tranzaksiyalar dinamikasi</CardTitle>
          <p className="mt-1 text-xs text-text-secondary">{mode === 'amount' ? 'Summa (UZS)' : 'Tranzaksiyalar soni (dona)'}</p>
          {periodLabel}
          {!plotUnavailable ? <p className="mt-1 text-xs text-text-secondary">Guruhlash: {TREND_GROUP_LABELS[view.chartGroupBy]}</p> : null}
          </div>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-start gap-2">
          {granularityControls}
          <div role="group" aria-label="Trend ko‘rinishi" className="flex max-w-full flex-wrap gap-0.5 rounded-lg bg-muted/60 p-0.5">
            {(['amount', 'count'] as const).map((option) => (
              <Button key={option} type="button" variant="outline" size="sm"
                aria-pressed={mode === option}
                className="rounded-lg border-transparent bg-transparent shadow-none dark:bg-transparent aria-pressed:border-brand/20 aria-pressed:bg-brand-soft aria-pressed:text-brand aria-pressed:font-semibold dark:aria-pressed:bg-brand-soft"
                onClick={() => { setMode(option) }}>
                {option === 'amount' ? 'Summa' : 'Soni'}
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
            Tanlangan davr uchun trend nuqtalari mavjud emas.
          </p>
        ) : (
          <div className="min-w-0 w-full">
            {config ? (
              <TrendPlotViewport config={config} interactionKey={prepared.interactionKey} />
            )
              : <div className="h-80" />}
          </div>
        )}
        <ul aria-label="Trend qatorlari" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-secondary">
          {TREND_SERIES.filter((item) => visible.includes(item.key)).map((item) => (
            <li key={item.key} className="flex items-center gap-2 py-1">
              <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${item.swatch}`} />
              <span>{item.label}{!plotUnavailable ? ` (${mode === 'amount' ? formatMoney(view.metrics[item.key].amount) : view.metrics[item.key].count.toLocaleString('uz-UZ')})` : ''}</span>
            </li>
          ))}
        </ul>
        {!plotUnavailable && view.buckets.length > 0 ? (
          <section className="sr-only" aria-label="Trend: davrlar bo‘yicha aniq qiymatlar">
            <p>Har bir davr uchun statuslarning aniq soni va summasi, yashirilgan qatorlar bilan birga.</p>
            <ul>
              {view.buckets.map((bucket, index) => (
                <li key={`${bucket.label}-${index}`}>
                  {bucket.label}: {bucket.coverage === 'FUTURE' ? 'Hali kuzatilmagan' : <>
                    {bucket.partial || bucket.coverage === 'PARTIAL' ? 'Qisman davr. ' : ''}{TREND_SERIES.filter(({ key }) => available.includes(key)).map((item) =>
                    `${item.label}: Soni: ${bucket.values[item.key].count.toLocaleString('uz-UZ')}, Summa: ${formatMoney(bucket.values[item.key].amount)}`).join('; ')}</>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
