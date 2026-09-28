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
import type { DashboardView, Metric } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { formatGrowth } from './presenters'

interface MetricDefinition {
  readonly label: string
  readonly metric: Metric
  readonly icon: LucideIcon
  readonly iconClassName: string
}

function MetricCard({
  label,
  metric,
  icon: Icon,
  iconClassName,
}: MetricDefinition) {
  return (
    <Card>
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <CardDescription>{label}</CardDescription>
        <span className={`rounded-lg p-2 ${iconClassName}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-text-primary">
          {formatMoney(metric.amount)}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {metric.count.toLocaleString('uz-UZ')} ta tranzaksiya
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
          <div>
            <dt className="text-text-secondary">Soni o‘sishi</dt>
            <dd className="mt-1 font-medium text-text-primary">
              {formatGrowth(metric.countGrowthPct)}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Summa o‘sishi</dt>
            <dd className="mt-1 font-medium text-text-primary">
              {formatGrowth(metric.amountGrowthPct)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

export function MetricCards({ metrics }: Pick<DashboardView, 'metrics'>) {
  const definitions: readonly MetricDefinition[] = [
    {
      label: 'Jami',
      metric: metrics.total,
      icon: QrCodeIcon,
      iconClassName: 'bg-brand-soft text-brand',
    },
    {
      label: 'Muvaffaqiyatli',
      metric: metrics.success,
      icon: CircleCheckIcon,
      iconClassName: statusToneClasses.success.icon,
    },
    {
      label: 'Jarayonda',
      metric: metrics.processing,
      icon: Clock3Icon,
      iconClassName: statusToneClasses.warning.icon,
    },
    {
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
