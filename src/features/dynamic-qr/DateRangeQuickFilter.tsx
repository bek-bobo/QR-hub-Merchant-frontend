import { useState } from 'react'
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import type { DateRange } from '@/shared/contracts/merchant-read'
import {
  buildCalendarMonth,
  monthStart,
  selectCalendarRangeDate,
  shiftCalendarMonth,
} from './date-range-calendar'

const weekdays = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'] as const

const monthFormatter = new Intl.DateTimeFormat('uz-UZ', {
  timeZone: 'UTC',
  month: 'short',
  year: 'numeric',
})

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
  onSelect,
  className,
}: {
  readonly month: string
  readonly selection: DateRange
  readonly onSelect: (date: string) => void
  readonly className?: string
}) {
  return (
    <section className={className} aria-label={monthFormatter.format(utcDate(month))}>
      <h3 className="mb-3 text-center text-sm font-semibold text-text-primary">
        {monthFormatter.format(utcDate(month))}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((weekday) => (
          <span key={weekday} className="py-1 text-xs text-text-secondary" aria-hidden="true">
            {weekday}
          </span>
        ))}
        {buildCalendarMonth(month).map((day) => {
          const endpoint = day.date === selection.fromDate || day.date === selection.toDate
          const inRange = Boolean(
            selection.toDate &&
            day.date >= selection.fromDate &&
            day.date <= selection.toDate,
          )
          return (
            <button
              key={day.date}
              type="button"
              aria-label={dayFormatter.format(utcDate(day.date))}
              aria-pressed={endpoint}
              className={`size-8 rounded-md text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
                endpoint
                  ? 'bg-primary text-primary-foreground'
                  : inRange
                    ? 'bg-brand-soft text-text-primary hover:bg-brand-soft/80'
                    : day.inMonth
                      ? 'text-text-primary hover:bg-muted'
                      : 'text-text-secondary/45 hover:bg-muted'
              }`}
              onClick={() => onSelect(day.date)}
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
  readonly value: DateRange
  readonly onDraftChange: (range: DateRange) => void
  readonly onApply: (range: DateRange) => void
  readonly onReset: () => void
}

export function DateRangeQuickFilter({
  value,
  onDraftChange,
  onApply,
  onReset,
}: DateRangeQuickFilterProps) {
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(value.fromDate))

  function selectDate(date: string) {
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
        if (nextOpen) {
          setVisibleMonth(monthStart(value.fromDate))
        }
        setOpen(nextOpen)
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-between gap-3 px-3 font-normal sm:w-auto sm:min-w-64"
          aria-label="Sana oralig‘ini tanlash"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span>{value.fromDate}</span>
            <span aria-hidden="true" className="text-text-secondary">→</span>
            <span>{value.toDate || '…'}</span>
          </span>
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
          <div className="mb-3 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Oldingi oy"
              onClick={() => setVisibleMonth((month) => shiftCalendarMonth(month, -1))}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <p className="text-xs text-text-secondary">Sana oralig‘ini tanlang</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Keyingi oy"
              onClick={() => setVisibleMonth((month) => shiftCalendarMonth(month, 1))}
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <CalendarMonth month={visibleMonth} selection={value} onSelect={selectDate} />
            <CalendarMonth
              month={shiftCalendarMonth(visibleMonth, 1)}
              selection={value}
              onSelect={selectDate}
              className="hidden md:block"
            />
          </div>
          <div className="mt-3 flex justify-end border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onReset()
                setOpen(false)
              }}
            >
              <RotateCcwIcon aria-hidden="true" />
              Standart 7 kunlik oraliq
            </Button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
