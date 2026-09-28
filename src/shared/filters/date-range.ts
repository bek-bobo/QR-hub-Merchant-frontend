import { safeContractError } from '@/shared/api/errors'
import type {
  DashboardFilters,
  DateRange,
} from '@/shared/contracts/merchant-read'

export type DatePresetDays = 1 | 7 | 30

const tashkentCalendarFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tashkent',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function tashkentCalendarDate(instant: Date): string {
  if (!Number.isFinite(instant.getTime())) {
    throw safeContractError()
  }

  const parts = Object.fromEntries(
    tashkentCalendarFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function subtractCalendarDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const calendar = new Date(Date.UTC(year, month - 1, day))
  calendar.setUTCDate(calendar.getUTCDate() - days)
  return calendar.toISOString().slice(0, 10)
}

export function getTashkentDatePreset(
  days: DatePresetDays,
  instant = new Date(),
): DateRange {
  const toDate = tashkentCalendarDate(instant)
  return Object.freeze({
    fromDate: subtractCalendarDays(toDate, days - 1),
    toDate,
  })
}

export function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export function isValidDateRange(range: DateRange): boolean {
  return (
    isIsoCalendarDate(range.fromDate) &&
    isIsoCalendarDate(range.toDate) &&
    range.fromDate <= range.toDate
  )
}

export function toDateTerminalQuery(
  filters: DashboardFilters,
): Readonly<Record<string, string>> {
  if (!isValidDateRange(filters)) {
    throw safeContractError()
  }

  const query: Record<string, string> = {
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  }
  const terminalId = filters.terminalId?.trim()
  if (terminalId) {
    query.terminalId = terminalId
  }

  return Object.freeze(query)
}
