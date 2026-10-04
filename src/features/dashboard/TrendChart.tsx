import { TrendPlotViewport } from './TrendPlotViewport'
import { useMerchantPlotTheme } from './plot-theme'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardView } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { createTrendPlotConfig, TREND_GROUP_LABELS, TREND_SERIES, type TrendMode } from './trend-presentation'
import { TrendSeriesSettings } from './TrendSeriesSettings'
import { useTrendSeriesPreferences } from './useTrendSeriesPreferences'

interface TrendChartProps {
  readonly view: DashboardView
  readonly rangeControls?: ReactNode
  readonly feedback?: ReactNode
  readonly plotUnavailable?: boolean
}

export function TrendChart({ view, rangeControls, feedback, plotUnavailable = false }: TrendChartProps) {
  const [mode, setMode] = useState<TrendMode>('count')
  const { visible, toggle } = useTrendSeriesPreferences()
  const theme = useMerchantPlotTheme()

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>Tranzaksiyalar dinamikasi</CardTitle>
          <p className="mt-1 text-xs text-text-secondary">{mode === 'amount' ? 'Summa (UZS)' : 'Tranzaksiyalar soni'}</p>
          {!plotUnavailable ? <p className="mt-1 text-xs text-text-secondary">Guruhlash: {TREND_GROUP_LABELS[view.chartGroupBy]}</p> : null}
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-start gap-2">
          {rangeControls}
          <div role="group" aria-label="Trend ko‘rinishi" className="flex max-w-full flex-wrap gap-0.5 rounded-lg bg-muted/60 p-0.5">
            {(['amount', 'count'] as const).map((option) => (
              <Button key={option} type="button" variant="outline" size="sm"
                aria-pressed={mode === option}
                className="border-transparent bg-transparent shadow-none dark:bg-transparent aria-pressed:border-border aria-pressed:bg-card aria-pressed:text-text-primary aria-pressed:font-semibold dark:aria-pressed:bg-card"
                onClick={() => { setMode(option) }}>
                {option === 'amount' ? 'Summa' : 'Soni'}
              </Button>
            ))}
          </div>
          <TrendSeriesSettings visible={visible} onToggle={toggle} />
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5">
        <ul aria-label="Trend qatorlari" className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-text-secondary">
          {TREND_SERIES.filter((item) => visible.includes(item.key)).map((item) => (
            <li key={item.key} className="flex items-center gap-2 py-1">
              <span aria-hidden="true" className={`h-0.5 w-3 shrink-0 rounded-full ${item.swatch}`} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        {feedback}
        {plotUnavailable ? null : view.buckets.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-text-secondary">
            Tanlangan davr uchun trend nuqtalari mavjud emas.
          </p>
        ) : (
          <div className="min-w-0 w-full" aria-hidden="true">
            {theme ? (
              <TrendPlotViewport config={createTrendPlotConfig(view, mode, visible, theme)} />
            )
              : <div className="h-80" />}
          </div>
        )}
        {!plotUnavailable && view.buckets.length > 0 ? (
          <section className="sr-only" aria-label="Trend: davrlar bo‘yicha aniq qiymatlar">
            <p>Har bir davr uchun barcha to‘rt seriyaning aniq soni va summasi, yashirilgan seriyalar bilan birga.</p>
            <ul>
              {view.buckets.map((bucket, index) => (
                <li key={`${bucket.label}-${index}`}>
                  {bucket.label}: {TREND_SERIES.map((item) =>
                    `${item.label}: Soni: ${bucket.values[item.key].count.toLocaleString('uz-UZ')}, Summa: ${formatMoney(bucket.values[item.key].amount)}`).join('; ')}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}
