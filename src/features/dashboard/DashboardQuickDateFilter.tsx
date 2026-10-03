import { Button } from '@/components/ui/button'
import { DateRangeQuickFilter } from '@/features/dynamic-qr/DateRangeQuickFilter'
import type { DateRange } from '@/shared/contracts/merchant-read'
import type { DatePresetDays } from '@/shared/filters/date-range'

interface DashboardQuickDateFilterProps {
  readonly range: DateRange
  readonly validationMessage: string | null
  readonly onDraftChange: (range: DateRange) => void
  readonly onApply: () => void
  readonly onPreset: (days: DatePresetDays) => void
  readonly onReset: () => void
}

export function DashboardQuickDateFilter({ range, validationMessage, onDraftChange,
  onApply, onPreset, onReset }: DashboardQuickDateFilterProps) {
  return <div className="min-w-0 space-y-2">
    <div className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Dashboard sana filtri">
      {/* Calendar completion updates the draft; Dashboard requires its own explicit Apply. */}
      <DateRangeQuickFilter value={range} onDraftChange={onDraftChange}
        onApply={onDraftChange} onReset={onReset} />
      <div className="flex flex-wrap gap-2" aria-label="Davr presetlari">
        {([1, 7, 30] as const).map((days) => (
          <Button key={days} type="button" variant="outline" size="sm" onClick={() => onPreset(days)}>
            {days} kun
          </Button>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onApply}>Sanalarni qo‘llash</Button>
    </div>
    {validationMessage ? <p role="alert" className="text-sm text-destructive">{validationMessage}</p> : null}
  </div>
}
