import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import type { DateRange } from '@/shared/contracts/merchant-read'
import { getTashkentDatePreset } from '@/shared/filters/date-range'
import {
  buildCalendarMonth,
  calendarMonthForRange,
  formatCalendarMonthLabel,
  getCalendarPreviewRange,
  selectCalendarRangeDate,
  shiftCalendarMonth,
} from './date-range-calendar'

const weekdays = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'] as const

// Optional presentation port for consumers migrating ahead of Dynamic QR.
// Calendar selection and layout calculations remain independent of locale.
export interface DateRangePresentation {
  readonly weekdays: readonly string[]
  month(value: string): string
  date(value: string, options?: Intl.DateTimeFormatOptions): string
  message(key: 'dates.choose' | 'dates.previous' | 'dates.next' | 'dates.reset'): string
}

// Match the md breakpoint that exposes the second month panel.
const twoPanelQuery = '(min-width: 768px)'
function subscribeToPanelLayout(onChange: () => void) {
  const query = window.matchMedia(twoPanelQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
function readTwoPanelLayout() {
  return window.matchMedia(twoPanelQuery).matches
}
function singlePanelLayout() { return false }

const dayFormatter = new Intl.DateTimeFormat('uz-UZ', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`)
}

function CalendarMonth({
  month,
  selection,
  preview,
  today,
  onSelect,
  onHover,
  className,
  otherVisibleMonth,
  navigation,
  presentation,
}: {
  readonly presentation?: DateRangePresentation | undefined
  readonly month: string
  readonly selection: DateRange
  readonly preview: DateRange | null
  readonly today: string
  readonly onSelect: (date: string) => void
  readonly onHover: (date: string | null) => void
  readonly className?: string
  readonly otherVisibleMonth?: string
  readonly navigation: ReactNode
}) {
  return (
    <section className={className} aria-label={(presentation?.month(month) ?? formatCalendarMonthLabel(month))}>
      <div className="relative mb-3 flex h-8 items-center justify-center">
        <h3 className="text-center text-sm font-semibold text-text-primary">
          {presentation?.month(month) ?? formatCalendarMonthLabel(month)}
        </h3>
        {navigation}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {(presentation?.weekdays ?? weekdays).map((weekday) => (
          <span key={weekday} className="py-1 text-xs text-text-secondary" aria-hidden="true">
            {weekday}
          </span>
        ))}
        {buildCalendarMonth(month).map((day) => {
          const canonical = day.inMonth || day.date.slice(0, 7) !== otherVisibleMonth?.slice(0, 7)
          const endpoint = canonical && (day.date === selection.fromDate || day.date === selection.toDate)
          const inRange = Boolean(
            canonical && selection.toDate &&
            day.date >= selection.fromDate &&
            day.date <= selection.toDate,
          )
          const previewEndpoint = Boolean(canonical && preview && (day.date === preview.fromDate || day.date === preview.toDate))
          const inPreview = Boolean(canonical && preview && day.date >= preview.fromDate && day.date <= preview.toDate)
          const previewState = !inPreview ? undefined
            : day.date === preview!.fromDate && day.date === preview!.toDate ? 'same-day'
              : day.date === preview!.fromDate ? 'start'
                : day.date === preview!.toDate ? 'end' : 'in-range'
          const showTodayRing = canonical && day.date === today && !endpoint && !inRange && !inPreview
          return (
            <button
              key={day.date}
              type="button"
              aria-label={(presentation?.date(day.date, {day: 'numeric', month: 'long', year: 'numeric'}) ?? dayFormatter.format(utcDate(day.date)))}
              aria-pressed={endpoint}
              aria-current={canonical && day.date === today ? 'date' : undefined}
              data-calendar-date={day.date}
              data-preview={previewState}
              className={`size-8 rounded-md text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
                endpoint
                  ? 'bg-primary text-primary-foreground'
                  : previewEndpoint
                    ? 'bg-brand-soft text-text-primary ring-1 ring-inset ring-brand/50'
                    : inRange || inPreview
                      ? 'bg-brand-soft text-text-primary hover:bg-brand-soft/80'
                      : day.inMonth
                        ? 'text-text-primary hover:bg-muted'
                        : 'text-text-secondary/45 hover:bg-muted'
              } ${showTodayRing ? 'ring-1 ring-inset ring-brand/40' : ''}`}
              onClick={() => onSelect(day.date)}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') onHover(day.date)
              }}
              onPointerLeave={() => onHover(null)}
            >
              {day.day}
            </button>
          )
        })}
      </div>
    </section>
  )
}

interface DateRangeQuickFilterProps {
  readonly presentation?: DateRangePresentation
  readonly triggerLabel?: string
  readonly resetLabel?: string
  readonly value: DateRange
  readonly onDraftChange: (range: DateRange) => void
  readonly onApply: (range: DateRange) => void
  readonly onReset: () => void
}

export function DateRangeQuickFilter({
  triggerLabel,
  presentation,
  resetLabel = 'Standart 7 kunlik oraliq',
  value,
  onDraftChange,
  onApply,
  onReset,
}: DateRangeQuickFilterProps) {
  const [open, setOpen] = useState(false)
  const twoPanels = useSyncExternalStore(subscribeToPanelLayout, readTwoPanelLayout, singlePanelLayout)
  const [visibleMonth, setVisibleMonth] = useState(() => calendarMonthForRange(value))
  const [hoveredDate, setHoveredDate] = useState<{ fromDate: string; date: string } | null>(null)
  // Discard hover when a consumer replaces the draft; it belongs to that first date only.
  if (hoveredDate && (!open || value.toDate || hoveredDate.fromDate !== value.fromDate)) {
    setHoveredDate(null)
  }
  const preview = open && hoveredDate?.fromDate === value.fromDate
    ? getCalendarPreviewRange(value, hoveredDate.date) : null
  const today = getTashkentDatePreset(1).fromDate

  function hoverDate(date: string | null) {
    setHoveredDate(open && value.fromDate && !value.toDate && date ? { fromDate: value.fromDate, date } : null)
  }

  function navigateMonth(offset: number) {
    setHoveredDate(null)
    setVisibleMonth((month) => shiftCalendarMonth(month, offset))
  }

  function selectDate(date: string) {
    setHoveredDate(null)
    const next = selectCalendarRangeDate(value, date)
    onDraftChange(next)
    if (next.toDate) {
      onApply(next)
      setOpen(false)
    }
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setHoveredDate(null)
        if (nextOpen) {
          setVisibleMonth(calendarMonthForRange(value))
        }
        setOpen(nextOpen)
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          className={triggerLabel ? 'h-8 max-w-full gap-2 px-3 font-normal' : 'h-9 w-full justify-between gap-3 px-3 font-normal sm:w-auto sm:min-w-64'}
          aria-label={presentation?.message('dates.choose') ?? (triggerLabel ? `Grafik sana oralig‘ini tanlash: ${triggerLabel}` : 'Sana oralig‘ini tanlash')}
        >
          {triggerLabel ? <span>{triggerLabel}</span> : <span className="flex min-w-0 items-center gap-2">
            <span>{presentation?.date(value.fromDate) ?? value.fromDate}</span>
            <span aria-hidden="true" className="text-text-secondary">→</span>
            <span>{value.toDate ? presentation?.date(value.toDate) ?? value.toDate : '…'}</span>
          </span>}
          <CalendarDaysIcon aria-hidden="true" className="shrink-0" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[min(calc(100vw-2rem),42rem)] rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg outline-none sm:p-4"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <CalendarMonth
              presentation={presentation}
              month={visibleMonth}
              selection={value}
              preview={preview}
              today={today}
              otherVisibleMonth={twoPanels ? shiftCalendarMonth(visibleMonth, 1) : undefined}
              onSelect={selectDate}
              onHover={hoverDate}
              navigation={
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={presentation?.message('dates.previous') ?? 'Oldingi oy'}
                    className="absolute left-0"
                    onClick={() => navigateMonth(-1)}
                  >
                    <ChevronLeftIcon aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={presentation?.message('dates.next') ?? 'Keyingi oy'}
                    className="absolute right-0 md:hidden"
                    onClick={() => navigateMonth(1)}
                  >
                    <ChevronRightIcon aria-hidden="true" />
                  </Button>
                </>
              }
            />
            <CalendarMonth
              presentation={presentation}
              month={shiftCalendarMonth(visibleMonth, 1)}
              selection={value}
              preview={preview}
              today={today}
              onSelect={selectDate}
              onHover={hoverDate}
              className="hidden md:block"
              otherVisibleMonth={visibleMonth}
              navigation={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={presentation?.message('dates.next') ?? 'Keyingi oy'}
                  className="absolute right-0"
                  onClick={() => navigateMonth(1)}
                >
                  <ChevronRightIcon aria-hidden="true" />
                </Button>
              }
            />
          </div>
          <div className="mt-3 flex justify-end border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setHoveredDate(null)
                onReset()
                setOpen(false)
              }}
            >
              <RotateCcwIcon aria-hidden="true" />
              {presentation?.message('dates.reset') ?? resetLabel}
            </Button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
