import type { LucideIcon } from 'lucide-react'
import {
  CircleCheckIcon,
  Clock3Icon,
  QrCodeIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import type { DashboardView, Metric, Outcome } from '@/shared/contracts/merchant-read'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { reconcileDashboard } from './presenters'

interface MetricDefinition {
  readonly outcome: Outcome
  readonly label: string
  readonly metric: Metric
  readonly icon: LucideIcon
  readonly iconClassName: string
  readonly description: string
  readonly percent?: number | undefined
}

function MetricCard({
  outcome,
  label,
  metric,
  icon: Icon,
  iconClassName,
  description,
  percent,
}: MetricDefinition) {
  return (
    <Card data-outcome={outcome} className="dashboard-metric relative min-w-0 gap-2 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(5)]">
      <svg aria-hidden="true" viewBox="0 0 240 70" preserveAspectRatio="none" className="pointer-events-none absolute inset-y-0 right-0 h-full w-3/4 text-[var(--metric-accent)]">
        <path d="M0 70C100 70 132 55 166 21S216 0 240 8V70Z" fill="currentColor" opacity="0.035" />
        <path d="M0 70C118 70 141 58 179 39S220 23 240 25V70Z" fill="currentColor" opacity="0.04" />
      </svg>
      <CardHeader className="relative flex min-h-11 flex-row items-center gap-4">
        <span className={`relative flex size-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <CardDescription className="relative font-semibold">{label}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <p className="text-3xl font-bold tracking-tight text-text-primary [overflow-wrap:anywhere]">{metric.count.toLocaleString('uz-UZ')}</p>
          {percent !== undefined ? <span aria-label={`${label} ulushi`} className={`rounded-full px-3 py-0.5 text-sm font-semibold ${iconClassName}`}>{percent.toLocaleString('uz-UZ')}%</span> : null}
        </div>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </CardContent>
    </Card>
  )
}

export function MetricCards({ metrics, pie }: Pick<DashboardView, 'metrics'> & Partial<Pick<DashboardView, 'pie'>>) {
  const showPercent = Boolean(pie && metrics.total.count > 0 && reconcileDashboard({ metrics, pie }).countMatches)
  const definitions: readonly MetricDefinition[] = [
    {
      outcome: 'total',
      label: 'Jami',
      description: 'Barcha tranzaksiyalar',
      metric: metrics.total,
      icon: QrCodeIcon,
      iconClassName: 'bg-brand-soft text-brand',
    },
    {
      outcome: 'success',
      label: 'Muvaffaqiyatli',
      description: 'Muvaffaqiyatli tranzaksiyalar',
      percent: showPercent ? pie?.success.percent : undefined,
      metric: metrics.success,
      icon: CircleCheckIcon,
      iconClassName: statusToneClasses.success.icon,
    },
    {
      outcome: 'processing',
      label: 'Jarayonda',
      description: 'Jarayondagi tranzaksiyalar',
      percent: showPercent ? pie?.processing.percent : undefined,
      metric: metrics.processing,
      icon: Clock3Icon,
      iconClassName: statusToneClasses.warning.icon,
    },
    {
      outcome: 'failed',
      label: 'Muvaffaqiyatsiz',
      description: 'Muvaffaqiyatsiz tranzaksiyalar',
      percent: showPercent ? pie?.failed.percent : undefined,
      metric: metrics.failed,
      icon: TriangleAlertIcon,
      iconClassName: statusToneClasses.error.icon,
    },
  ]

  return (
    <section
      aria-label="Asosiy ko‘rsatkichlar"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {definitions.map((definition) => (
        <MetricCard key={definition.label} {...definition} />
      ))}
    </section>
  )
}
