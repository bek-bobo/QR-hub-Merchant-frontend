import { Button } from '@/components/ui/button'
import type { DashboardView, ChartGroupBy } from '@/shared/contracts/merchant-read'

const options = [['HOUR', 'Soat'], ['DAY', 'Kun'], ['WEEK', 'Hafta'], ['MONTH', 'Oy'], ['YEAR', 'Yil']] as const
export function GranularityControl({ aggregation, onSelect }: {
  readonly aggregation: DashboardView['aggregation']
  readonly onSelect: (value: ChartGroupBy) => void
}) {
  return <div role="group" aria-label="Grafik guruhlash" className="flex min-w-0 flex-wrap items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
    {options.map(([value, label]) => {
      const allowed = aggregation.allowedGranularities.includes(value)
      return <Button key={value} type="button" variant="outline" size="sm" disabled={!allowed}
        className="border-transparent bg-transparent shadow-none aria-pressed:border-brand/20 aria-pressed:bg-brand-soft aria-pressed:font-semibold aria-pressed:text-brand"
        aria-pressed={aggregation.resolvedGranularity === value}
        onClick={() => { if (allowed) onSelect(value) }}>{label}</Button>
    })}
  </div>
}
