import { StatusPiePlotRenderer } from './LazyPlotRenderers'
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
  // This share includes ALL transactions, independently of donut reconciliation.
  const successShare = metrics.total.count === 0
    ? '—'
    : `${(metrics.success.count / metrics.total.count * 100).toLocaleString('uz-UZ', {
      maximumFractionDigits: 2,
    })}%`
  const items = [
    { label: 'Muvaffaqiyatli', value: pie.success, tone: 'success' },
    { label: 'Jarayonda', value: pie.processing, tone: 'warning' },
    { label: 'Muvaffaqiyatsiz', value: pie.failed, tone: 'error' },
  ] as const
  const totalPercent = items.reduce((sum, item) => sum + item.value.percent, 0)
  const hasDistribution = reconciliation.countMatches && totalPercent > 0
  const accessibleLabel = hasDistribution
    ? items
        .map((item) => `${item.label}: ${item.value.percent.toLocaleString('uz-UZ')}%`)
        .join(', ')
    : 'Status taqsimoti mavjud emas'

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Statuslar taqsimoti</CardTitle>
        <dl className="mt-3 min-w-0">
          <dt className="text-sm text-text-secondary">Muvaffaqiyat ulushi</dt>
          <dd className="mt-1 text-xl font-semibold text-text-primary [overflow-wrap:anywhere]">{successShare}</dd>
        </dl>
        <p className="mt-1 text-xs text-text-secondary">
          {metrics.total.count === 0
            ? 'Tanlangan davrda tranzaksiyalar mavjud emas.'
            : 'Jami tranzaksiyalar soniga nisbatan'}
        </p>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-center xl:flex-col">
        <div className="relative w-full max-w-64 shrink-0">
          <div role="img" aria-label={accessibleLabel} data-empty={!hasDistribution || undefined}>
            {hasDistribution && theme ? (
              <div aria-hidden="true">
                <PlotViewportBoundary fallback={<div data-plot-loading="donut" className="h-64 w-full rounded-full bg-muted/40 motion-safe:animate-pulse" />}>
                  <StatusPiePlotRenderer {...createDonutPlotConfig({ pie, metrics }, theme)} />
                </PlotViewportBoundary>
              </div>
            ) : (
              <div aria-hidden="true" className="mx-auto aspect-square w-full rounded-full border-[28px] border-muted" />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="min-w-0 w-1/2 text-center">
              <p className="text-lg font-semibold leading-snug text-text-primary [overflow-wrap:anywhere]">
                {metrics.total.count.toLocaleString('uz-UZ')}
              </p>
              <p className="mt-1 text-xs text-text-secondary">Jami</p>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 max-w-xl">
          <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {items.map((item) => (
              <div
                key={item.label}
                className="grid min-w-0 grid-cols-1 items-start gap-1 rounded-lg border p-3"
              >
                <dt className="flex min-w-0 items-center gap-2 text-sm text-text-secondary">
                  <span
                    aria-hidden="true"
                    className={`size-2 shrink-0 rounded-full ${statusToneClasses[item.tone].indicator}`}
                  />
                  <span className="min-w-0 break-words">{item.label}</span>
                </dt>
                <dd className="min-w-0 text-left [overflow-wrap:anywhere]">
                  <p className="font-semibold text-text-primary">
                    {item.value.count.toLocaleString('uz-UZ')}
                    {reconciliation.countMatches
                      ? ` · ${item.value.percent.toLocaleString('uz-UZ')}%`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {formatMoney(item.value.amount)}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
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
