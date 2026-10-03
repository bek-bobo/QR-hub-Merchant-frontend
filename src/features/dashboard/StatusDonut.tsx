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

const segmentStyles = {
  success: 'stroke-status-success-indicator',
  warning: 'stroke-status-warning-indicator',
  error: 'stroke-status-error-indicator',
} as const

type StatusDonutProps = Pick<DashboardView, 'pie' | 'metrics'>

export function StatusDonut({ pie, metrics }: StatusDonutProps) {
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
  let offset = 0

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
        <div className="w-full max-w-64 shrink-0">
          <svg
            viewBox="0 0 120 120"
            className="mx-auto aspect-square w-full"
            role="img"
            aria-label={accessibleLabel}
          >
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              strokeWidth="14"
              className="stroke-muted"
              data-empty={!hasDistribution || undefined}
            />
            {hasDistribution
              ? items.map((item) => {
                  const startOffset = offset
                  offset += item.value.percent
                  if (item.value.percent <= 0) {
                    return null
                  }
                  return (
                    <circle
                      key={item.label}
                      cx="60"
                      cy="60"
                      r="45"
                      fill="none"
                      pathLength="100"
                      strokeWidth="14"
                      strokeDasharray={`${item.value.percent} ${100 - item.value.percent}`}
                      strokeDashoffset={-startOffset}
                      strokeLinecap="butt"
                      className={segmentStyles[item.tone]}
                      transform="rotate(-90 60 60)"
                    />
                  )
                })
              : null}
            <text x="60" y="57" textAnchor="middle" className="fill-text-primary text-lg font-semibold">
              {metrics.total.count.toLocaleString('uz-UZ')}
            </text>
            <text x="60" y="72" textAnchor="middle" className="fill-text-secondary text-[9px]">
              Jami
            </text>
          </svg>
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
