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
import { formatMoney } from '@/shared/money/minor'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { MetricGrowthIndicator } from './MetricGrowthIndicator'

interface MetricDefinition {
  readonly outcome: Outcome
  readonly label: string
  readonly metric: Metric
  readonly icon: LucideIcon
  readonly iconClassName: string
}

function MetricCard({
  outcome,
  label,
  metric,
  icon: Icon,
  iconClassName,
}: MetricDefinition) {
  return (
    <Card className="min-w-0">
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <CardDescription>{label}</CardDescription>
        <span className={`rounded-lg p-2 ${iconClassName}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-text-primary [overflow-wrap:anywhere]">
          {formatMoney(metric.amount)}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {metric.count.toLocaleString('uz-UZ')} ta tranzaksiya
        </p>
        <div className="mt-4 border-t pt-3 text-xs">
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-3">
            <MetricGrowthIndicator label="Soni o‘zgarishi" value={metric.countGrowthPct} outcome={outcome} />
            <MetricGrowthIndicator label="Summa o‘zgarishi" value={metric.amountGrowthPct} outcome={outcome} />
          </dl>
          <p className="mt-2 text-text-secondary">Oldingi davrga nisbatan</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function MetricCards({ metrics }: Pick<DashboardView, 'metrics'>) {
  const definitions: readonly MetricDefinition[] = [
    {
      outcome: 'total',
      label: 'Jami',
      metric: metrics.total,
      icon: QrCodeIcon,
      iconClassName: 'bg-brand-soft text-brand',
    },
    {
      outcome: 'success',
      label: 'Muvaffaqiyatli',
      metric: metrics.success,
      icon: CircleCheckIcon,
      iconClassName: statusToneClasses.success.icon,
    },
    {
      outcome: 'processing',
      label: 'Jarayonda',
      metric: metrics.processing,
      icon: Clock3Icon,
      iconClassName: statusToneClasses.warning.icon,
    },
    {
      outcome: 'failed',
      label: 'Muvaffaqiyatsiz',
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
