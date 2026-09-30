import type { DateRange } from '@/shared/contracts/merchant-read'

export interface CalendarDay {
  readonly date: string
  readonly day: number
  readonly inMonth: boolean
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`)
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function monthStart(value: string): string {
  const date = parseDate(value)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export function shiftCalendarMonth(value: string, offset: number): string {
  const date = parseDate(monthStart(value))
  date.setUTCMonth(date.getUTCMonth() + offset)
  return formatDate(date)
}

export function buildCalendarMonth(value: string): readonly CalendarDay[] {
  const first = parseDate(monthStart(value))
  const mondayOffset = (first.getUTCDay() + 6) % 7
  const cursor = new Date(first)
  cursor.setUTCDate(cursor.getUTCDate() - mondayOffset)
  const targetMonth = first.getUTCMonth()

  return Object.freeze(Array.from({ length: 42 }, (_, index) => {
    const date = new Date(cursor)
    date.setUTCDate(cursor.getUTCDate() + index)
    return Object.freeze({
      date: formatDate(date),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === targetMonth,
    })
  }))
}

export function selectCalendarRangeDate(
  current: DateRange,
  date: string,
): DateRange {
  if (current.fromDate && !current.toDate) {
    return date < current.fromDate
      ? Object.freeze({ fromDate: date, toDate: current.fromDate })
      : Object.freeze({ fromDate: current.fromDate, toDate: date })
  }

  return Object.freeze({ fromDate: date, toDate: '' })
}
