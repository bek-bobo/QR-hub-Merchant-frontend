import { useDashboardPresentation } from './presentation'
import { Button } from '@/components/ui/button'
import { DateRangeQuickFilter } from '@/features/dynamic-qr/DateRangeQuickFilter'
import type { DateRange } from '@/shared/contracts/merchant-read'
import { getTashkentDatePreset, type DatePresetDays } from '@/shared/filters/date-range'

interface DashboardQuickDateFilterProps {
  readonly range: DateRange
  readonly initialInstant?: Date | undefined
  readonly validationMessage: string | null
  readonly onDraftChange: (range: DateRange) => void
  readonly onRangeComplete: (range: DateRange) => void
  readonly onPreset: (days: DatePresetDays) => void
  readonly onReset: () => void
}

export function DashboardQuickDateFilter({ range, initialInstant, validationMessage, onDraftChange,
  onRangeComplete, onPreset, onReset }: DashboardQuickDateFilterProps) {
  const p = useDashboardPresentation()
  return <div className="min-w-0 space-y-2">
    <div className="flex min-w-0 flex-wrap items-center gap-2" aria-label={p.message('filters.dates')}>
      <DateRangeQuickFilter value={range} presentation={p} onDraftChange={onDraftChange}
        onApply={onRangeComplete} onReset={onReset} />
      <div className="flex flex-wrap gap-2" aria-label={p.message('filters.presets')}>
        {([1, 7, 30] as const).map((days) => {
          const preset = getTashkentDatePreset(days, initialInstant ?? new Date())
          const selected = range.fromDate === preset.fromDate && range.toDate === preset.toDate
          return <Button key={days} type="button" variant="outline" size="sm" aria-pressed={selected}
            className="h-9 rounded-xl bg-surface px-4 aria-pressed:border-brand/20 aria-pressed:bg-brand-soft aria-pressed:text-brand"
            onClick={() => onPreset(days)}>
            {p.message('filters.preset', {count: days})}
          </Button>
        })}
      </div>
    </div>
    {validationMessage ? <p role="alert" className="text-sm text-destructive">{p.message('filters.invalid')}</p> : null}
  </div>
}
