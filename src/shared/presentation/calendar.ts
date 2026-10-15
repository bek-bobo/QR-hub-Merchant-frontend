import { languageRegistry, type SupportedLocale } from '@/shared/i18n/registry'
import { isIsoCalendarDate } from '@/shared/filters/date-range'
import { formatOffsetlessDateTime } from './date-time'
import type { createMessages } from '@/shared/i18n/messages'

const monthKeys = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const

// Standalone picker captions use the common catalog rather than host ICU month
// data, which can expose identifiers such as M10 for supported Uzbek locales.
// Keep lexical calendar carriers and existing date/query formatting unchanged.
export function formatCalendarMonthCaption(value: string, common: ReturnType<typeof createMessages<'common'>>): string {
  if (!isIsoCalendarDate(value.slice(0, 10))) return value || '—'
  const key = monthKeys[Number(value.slice(5, 7)) - 1]!
  return common.message('calendar.caption', {
    month: common.message(`calendar.months.${key}`),
    year: value.slice(0, 4),
  })
}

// The shared range trigger follows the approved numeric design in every locale.
// Slice validated date-only carriers directly: no timezone conversion.
export function formatDateRangeEndpoint(value: string): string {
  if (!isIsoCalendarDate(value)) return value || '—'
  return `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`
}

// Presentation of calendar carriers and offsetless wall time, never API dates.
export function createCalendarPresentation(locale: SupportedLocale) {
  const intlLocale = languageRegistry[locale].intlLocale
  const date = (value: string, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) => {
    if (!isIsoCalendarDate(value.slice(0, 10))) return value || '—'
    if (locale === 'uz' && options.month === '2-digit') {
      return `${value.slice(8,10)}.${value.slice(5,7)}${options.year ? `.${value.slice(0,4)}` : ''}`
    }
    return new Intl.DateTimeFormat(intlLocale, { ...options, timeZone: 'UTC' }).format(new Date(`${value.slice(0,10)}T00:00:00Z`))
  }
  return {
    date,
    // Table/detail wall-clock timestamps use the approved numeric format in all
    // locales. Keep calendar/chart date labels on their existing locale policy.
    wallTime: formatOffsetlessDateTime,
    month: (value: string) => date(value, { month: 'short', year: 'numeric' }),
    weekdays: Array.from({ length: 7 }, (_, index) => date(`2026-10-${String(5+index).padStart(2,'0')}`, { weekday: 'short' })),
  }
}
