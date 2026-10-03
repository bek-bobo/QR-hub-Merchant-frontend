import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import type { Outcome } from '@/shared/contracts/merchant-read'
import { formatGrowth } from './presenters'

interface MetricGrowthIndicatorProps {
  readonly label: string
  readonly value: number | null
  readonly outcome: Outcome
}

export function MetricGrowthIndicator({ label, value, outcome }: MetricGrowthIndicatorProps) {
  const direction = value === null || value === 0 ? null : value > 0 ? 'up' : 'down'
  // Direction describes the numeric change; desirability depends on the metric.
  const desirability = direction === null || outcome === 'total' || outcome === 'processing'
    ? 'neutral'
    : (outcome === 'success' ? direction === 'up' : direction === 'down')
      ? 'favorable'
      : 'unfavorable'
  const colorClass = desirability === 'favorable'
    ? 'text-status-success-foreground'
    : desirability === 'unfavorable'
      ? 'text-status-error-foreground'
      : 'text-text-primary'
  const description = value === null
    ? 'Taqqoslash mavjud emas'
    : direction === null
      ? 'O‘zgarish yo‘q'
      : `${direction === 'up' ? 'O‘sish' : 'Kamayish'}${
        desirability === 'favorable' ? ', ijobiy o‘zgarish'
          : desirability === 'unfavorable' ? ', salbiy o‘zgarish' : ''
      }`
  const DirectionIcon = direction === 'up' ? ArrowUpIcon : ArrowDownIcon

  return (
    <div className="min-w-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className={`mt-1 flex min-w-0 items-start gap-1 font-medium ${colorClass}`}>
        <span className="sr-only">{description}: </span>
        {direction ? <DirectionIcon className="size-3 shrink-0" aria-hidden="true" /> : null}
        <span className="min-w-0 [overflow-wrap:anywhere]">{formatGrowth(value)}</span>
      </dd>
    </div>
  )
}
