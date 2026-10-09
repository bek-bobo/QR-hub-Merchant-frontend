import { languageRegistry, type SupportedLocale } from '@/shared/i18n/registry'
import { isIsoCalendarDate } from '@/shared/filters/date-range'
import { formatOffsetlessDateTime } from './date-time'

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
    wallTime: (value: string) => {
      const validated = formatOffsetlessDateTime(value)
      return validated === value ? validated : `${date(value)} ${value.slice(11,16)}`
    },
    month: (value: string) => date(value, { month: 'short', year: 'numeric' }),
    weekdays: Array.from({ length: 7 }, (_, index) => date(`2026-10-${String(5+index).padStart(2,'0')}`, { weekday: 'short' })),
  }
}
