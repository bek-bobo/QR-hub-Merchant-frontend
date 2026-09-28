export interface InstantTimeFormatOptions {
  readonly locale?: string
  readonly timeZone?: string
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function formatOffsetlessDateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?$/.exec(value)
  if (!match) return value || '—'

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) ||
    hour > 23 || minute > 59 || second > 59) return value

  return `${dayText}.${monthText}.${yearText} ${hourText}:${minuteText}`
}

export function formatInstantTime(
  epochMilliseconds: number,
  options: InstantTimeFormatOptions = {},
): string {
  if (!Number.isFinite(epochMilliseconds)) return '—'
  return new Intl.DateTimeFormat(options.locale ?? 'uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(new Date(epochMilliseconds))
}
