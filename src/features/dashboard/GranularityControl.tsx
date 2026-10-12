import { useDashboardPresentation } from './presentation'
import { Button } from '@/components/ui/button'
import type { DashboardView, ChartGroupBy } from '@/shared/contracts/merchant-read'

const options = ['HOUR','DAY','WEEK','MONTH','YEAR'] as const
export function GranularityControl({ aggregation, onSelect }: {
  readonly aggregation: DashboardView['aggregation']
  readonly onSelect: (value: ChartGroupBy) => void
}) {
  const p = useDashboardPresentation()
  return <div role="group" aria-label={p.message('granularity.label')} className="flex min-w-0 flex-wrap items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
    {options.map((value) => {
      const allowed = aggregation.allowedGranularities.includes(value)
      return <Button key={value} type="button" variant="outline" size="sm" disabled={!allowed}
        className="border-transparent bg-transparent shadow-none aria-pressed:border-brand/20 aria-pressed:bg-brand-soft aria-pressed:font-semibold aria-pressed:text-brand"
        aria-pressed={aggregation.resolvedGranularity === value}
        onClick={() => { if (allowed) onSelect(value) }}>{p.message(`granularity.${value}`)}</Button>
    })}
  </div>
}
