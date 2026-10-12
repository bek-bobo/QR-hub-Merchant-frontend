import { useDashboardPresentation } from './presentation'
import { StatusPiePlotRenderer } from './LazyPlotRenderers'
import { ChartPieIcon } from 'lucide-react'
import { PlotViewportBoundary } from './PlotViewportBoundary'
import { createDonutPlotConfig } from './donut-presentation'
import { useMerchantPlotTheme } from './plot-theme'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardView } from '@/shared/contracts/merchant-read'

import { statusToneClasses } from '@/shared/presentation/status-tone'
import { reconcileDashboard } from './presenters'

type StatusDonutProps = Pick<DashboardView, 'pie' | 'metrics'>

export function StatusDonut({ pie, metrics }: StatusDonutProps) {
  const p = useDashboardPresentation()
  const theme = useMerchantPlotTheme()
  const reconciliation = reconcileDashboard({ metrics, pie })
  // Preserve the backend's independently computed share.
  const successShare = metrics.total.count === 0
    ? '—'
    : p.percent(pie.success.percent)
  const items = [
    { key: 'success', label: p.label('success'), value: pie.success, tone: 'success' },
    { key: 'processing', label: p.label('processing'), value: pie.processing, tone: 'warning' },
    { key: 'failed', label: p.label('failed'), value: pie.failed, tone: 'error' },
    ...(pie.uncategorized.count > 0 ? [{ key: 'uncategorized', label: p.label('uncategorized'), value: pie.uncategorized, tone: 'neutral' } as const] : []),
  ] as const
  const hasDistribution = reconciliation.countMatches && metrics.total.count > 0
  const accessibleLabel = hasDistribution
    ? items
        .map((item) => p.message('donut.shareItem', {label: item.label, percent: p.percent(item.value.percent)}))
        .join(', ')
    : p.message('donut.unavailable')

  return (
    <Card className="@container min-w-0 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(5)]">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><ChartPieIcon className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <CardTitle>{p.message('donut.title')}</CardTitle>
            <p className="mt-1 text-xs text-text-secondary">{p.message('donut.total', {countText: p.number(metrics.total.count)})}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col items-center gap-5 @md:flex-row @md:items-center">
        <div className="relative size-52 max-w-full shrink-0">
          <div role="img" aria-label={accessibleLabel} data-empty={!hasDistribution || undefined}>
            {hasDistribution && theme ? (
              <div aria-hidden="true">
                <PlotViewportBoundary fallback={<div data-plot-loading="donut" className="h-52 w-full rounded-full bg-muted/40 motion-safe:animate-pulse" />}>
                  <StatusPiePlotRenderer {...createDonutPlotConfig(p, { pie, metrics }, theme)} />
                </PlotViewportBoundary>
              </div>
            ) : (
              <div aria-hidden="true" className="mx-auto aspect-square w-full rounded-full border-[22px] border-muted" />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="min-w-0 w-1/2 text-center">
              <p data-slot="donut-center-total" className="text-2xl font-semibold leading-snug text-text-primary [overflow-wrap:anywhere]">
                {p.number(metrics.total.count)}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{p.label('total')}</p>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 flex-1">
          <dl className="grid gap-3">
            {items.map((item) => (
              <div
                key={item.key}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-border/60 pb-3 last:border-0"
              >
                <dt className="flex min-w-0 items-center gap-2 text-sm text-text-primary">
                  <span
                    aria-hidden="true"
                    className={`size-2 shrink-0 rounded-full ${statusToneClasses[item.tone].indicator}`}
                  />
                  <span className="min-w-0 break-words">{item.label}</span>
                </dt>
                <dd className="flex min-w-0 flex-wrap items-center justify-end gap-3 text-sm tabular-nums [overflow-wrap:anywhere]">
                  <span className="font-semibold text-text-primary">
                    {p.number(item.value.count)}
                  </span>
                  {reconciliation.countMatches ? <span className="min-w-14 text-right text-xs text-text-secondary">{p.percent(item.value.percent)}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
          <details className="mt-3 text-xs text-text-secondary">
            <summary className="w-fit cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{p.message('donut.details')}</summary>
            <dl className="mt-2 space-y-2">
              <div><dt>{p.message('donut.successShare')}</dt><dd className="text-text-primary">{successShare}</dd></div>
              {items.map((item) => <div key={item.label} className="flex flex-wrap justify-between gap-2"><dt>{item.label}</dt><dd>{p.money(item.value.amount)}</dd></div>)}
            </dl>
            <p className="mt-2">{p.message(metrics.total.count === 0 ? 'donut.empty' : 'donut.relative')}</p>
          </details>
          {!reconciliation.countMatches ? (
            <p role="note" className="mt-4 text-sm text-text-secondary">
              {p.message('donut.countMismatch')}
            </p>
          ) : null}
          {!reconciliation.amountMatches ? (
            <p role="note" className="mt-2 text-sm text-text-secondary">
              {p.message('donut.amountMismatch')}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
