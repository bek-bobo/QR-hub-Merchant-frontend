import type { DateRange } from '@/shared/contracts/merchant-read'
import { getTashkentDatePreset, isIsoCalendarDate } from '@/shared/filters/date-range'

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

const monthLabels = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'] as const

export function formatCalendarMonthLabel(month: string): string {
  const date = parseDate(month)
  return `${monthLabels[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

// Presentation only: never fill the unfinished draft's second endpoint.
export function getCalendarPreviewRange(draft: DateRange, hoveredDate: string | null): DateRange | null {
  if (draft.toDate || !isIsoCalendarDate(draft.fromDate) || !hoveredDate || !isIsoCalendarDate(hoveredDate)) return null
  return selectCalendarRangeDate(draft, hoveredDate)
}

export function monthStart(value: string): string {
  const date = parseDate(value)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
}

// Choose a display month without normalizing or committing the user's draft.
export function calendarMonthForRange(range: DateRange, instant = new Date()): string {
  const anchor = isIsoCalendarDate(range.fromDate) ? range.fromDate
    : isIsoCalendarDate(range.toDate) ? range.toDate
      : getTashkentDatePreset(1, instant).fromDate
  return monthStart(anchor)
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
