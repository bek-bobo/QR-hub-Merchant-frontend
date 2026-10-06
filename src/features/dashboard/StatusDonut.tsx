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
import { formatMoney } from '@/shared/money/minor'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { reconcileDashboard } from './presenters'

type StatusDonutProps = Pick<DashboardView, 'pie' | 'metrics'>

export function StatusDonut({ pie, metrics }: StatusDonutProps) {
  const theme = useMerchantPlotTheme()
  const reconciliation = reconcileDashboard({ metrics, pie })
  // Preserve the backend's independently computed share.
  const successShare = metrics.total.count === 0
    ? '—'
    : `${pie.success.percent.toLocaleString('uz-UZ', {
      maximumFractionDigits: 2,
    })}%`
  const items = [
    { label: 'Muvaffaqiyatli', value: pie.success, tone: 'success' },
    { label: 'Jarayonda', value: pie.processing, tone: 'warning' },
    { label: 'Muvaffaqiyatsiz', value: pie.failed, tone: 'error' },
    ...(pie.uncategorized.count > 0 ? [{ label: 'Tasniflanmagan', value: pie.uncategorized, tone: 'neutral' } as const] : []),
  ] as const
  const hasDistribution = reconciliation.countMatches && metrics.total.count > 0
  const accessibleLabel = hasDistribution
    ? items
        .map((item) => `${item.label}: ${item.value.percent.toLocaleString('uz-UZ')}%`)
        .join(', ')
    : 'Status taqsimoti mavjud emas'

  return (
    <Card className="@container min-w-0 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(5)]">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><ChartPieIcon className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <CardTitle>Statuslar taqsimoti</CardTitle>
            <p className="mt-1 text-xs text-text-secondary">Jami tranzaksiyalar: {metrics.total.count.toLocaleString('uz-UZ')}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col items-center gap-5 @md:flex-row @md:items-center">
        <div className="relative size-52 max-w-full shrink-0">
          <div role="img" aria-label={accessibleLabel} data-empty={!hasDistribution || undefined}>
            {hasDistribution && theme ? (
              <div aria-hidden="true">
                <PlotViewportBoundary fallback={<div data-plot-loading="donut" className="h-52 w-full rounded-full bg-muted/40 motion-safe:animate-pulse" />}>
                  <StatusPiePlotRenderer {...createDonutPlotConfig({ pie, metrics }, theme)} />
                </PlotViewportBoundary>
              </div>
            ) : (
              <div aria-hidden="true" className="mx-auto aspect-square w-full rounded-full border-[22px] border-muted" />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="min-w-0 w-1/2 text-center">
              <p data-slot="donut-center-total" className="text-2xl font-semibold leading-snug text-text-primary [overflow-wrap:anywhere]">
                {metrics.total.count.toLocaleString('uz-UZ')}
              </p>
              <p className="mt-1 text-xs text-text-secondary">Jami</p>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 flex-1">
          <dl className="grid gap-3">
            {items.map((item) => (
              <div
                key={item.label}
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
                    {item.value.count.toLocaleString('uz-UZ')}
                  </span>
                  {reconciliation.countMatches ? <span className="min-w-14 text-right text-xs text-text-secondary">{item.value.percent.toLocaleString('uz-UZ')}%</span> : null}
                </dd>
              </div>
            ))}
          </dl>
          <details className="mt-3 text-xs text-text-secondary">
            <summary className="w-fit cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Summalar va muvaffaqiyat ulushi</summary>
            <dl className="mt-2 space-y-2">
              <div><dt>Muvaffaqiyat ulushi</dt><dd className="text-text-primary">{successShare}</dd></div>
              {items.map((item) => <div key={item.label} className="flex flex-wrap justify-between gap-2"><dt>{item.label}</dt><dd>{formatMoney(item.value.amount)}</dd></div>)}
            </dl>
            <p className="mt-2">{metrics.total.count === 0 ? 'Tanlangan davrda tranzaksiyalar mavjud emas.' : 'Jami tranzaksiyalar soniga nisbatan'}</p>
          </details>
          {!reconciliation.countMatches ? (
            <p role="note" className="mt-4 text-sm text-text-secondary">
              Ayrim holatlar ushbu taqsimotga kirmagan; foizlar ko‘rsatilmaydi.
            </p>
          ) : null}
          {!reconciliation.amountMatches ? (
            <p role="note" className="mt-2 text-sm text-text-secondary">
              Kategoriyalar summasi jami summaga teng emas.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
