import { describe, expect, it, vi, afterEach } from 'vitest'
import { createLocaleRuntime } from '@/shared/i18n/runtime'
import { createMessages } from '@/shared/i18n/messages'
import { formatCalendarMonthCaption, formatDateRangeEndpoint } from './calendar'

describe('shared range endpoint presentation', () => {
  it.each(['Pacific/Honolulu', 'Asia/Tashkent', 'Pacific/Kiritimati'])('keeps date-only values in %s', (timezone) => {
    vi.stubEnv('TZ', timezone)
    expect(['2026-01-01', '2026-10-15', '2026-12-31', '2028-02-29'].map(formatDateRangeEndpoint))
      .toEqual(['01.01.2026', '15.10.2026', '31.12.2026', '29.02.2028'])
    vi.unstubAllEnvs()
  })
  it('preserves invalid drafts without manufacturing a date', () => {
    for (const value of ['2026-02-30', 'invalid', '2026-10-15T00:00:00Z']) expect(formatDateRangeEndpoint(value)).toBe(value)
    expect(formatDateRangeEndpoint('')).toBe('—')
  })
})

afterEach(() => vi.restoreAllMocks())
describe('catalog-backed picker month captions', () => {
  it.each([
    ['uz', ['Yanvar 2026', 'Oktabr 2026', 'Dekabr 2026', 'Yanvar 2027']],
    ['ru', ['Январь 2026', 'Октябрь 2026', 'Декабрь 2026', 'Январь 2027']],
    ['en', ['January 2026', 'October 2026', 'December 2026', 'January 2027']],
  ] as const)('formats standalone months and year boundaries for %s without host ICU fallback', async (locale, expected) => {
    const runtime = createLocaleRuntime(); await runtime.initialize(locale)
    const common = createMessages(runtime, 'common')
    const intl = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => { throw new Error('Host month data unavailable') })
    const values = ['2026-01-01', '2026-10-01', '2026-12-01', '2027-01-01']
    expect(values.map(value => formatCalendarMonthCaption(value, common))).toEqual(expected)
    expect(intl).not.toHaveBeenCalled()
  })

  it('uses the committed runtime language and preserves invalid carriers neutrally', async () => {
    const runtime = createLocaleRuntime(); await runtime.initialize('uz')
    const common = createMessages(runtime, 'common')
    expect(formatCalendarMonthCaption('2026-10-01', common)).toBe('Oktabr 2026')
    await runtime.switchLocale('ru')
    expect(formatCalendarMonthCaption('2026-10-01', common)).toBe('Октябрь 2026')
    await runtime.switchLocale('en')
    expect(formatCalendarMonthCaption('2026-10-01', common)).toBe('October 2026')
    for (const value of ['invalid', '2026-13-01', '2026-02-30']) expect(formatCalendarMonthCaption(value, common)).toBe(value)
  })
})
