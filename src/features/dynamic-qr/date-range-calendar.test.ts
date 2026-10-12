import { describe, expect, it } from 'vitest'
import {
  buildCalendarMonth,
  calendarMonthForRange,
  formatCalendarMonthLabel,
  getCalendarPreviewRange,
  selectCalendarRangeDate,
  shiftCalendarMonth,
} from './date-range-calendar'

describe('date range calendar state', () => {
  it('formats all twelve months deterministically in Uzbek, month before year', () => {
    expect(Array.from({ length: 12 }, (_, index) => formatCalendarMonthLabel(`2026-${String(index + 1).padStart(2, '0')}-01`)))
      .toEqual(['Yan 2026', 'Fev 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Iyun 2026', 'Iyul 2026', 'Avg 2026', 'Sen 2026', 'Okt 2026', 'Noy 2026', 'Dek 2026'])
    expect(formatCalendarMonthLabel('2027-01-01')).toBe('Yan 2027')
  })
  it.each(['2026-10-10', '2026-10-15', '2026-11-02'])('sorts preview for %s without filling or changing the draft', (hovered) => {
    const draft = { fromDate: '2026-10-15', toDate: '' }
    expect(getCalendarPreviewRange(draft, hovered)).toEqual({ fromDate: hovered < draft.fromDate ? hovered : draft.fromDate, toDate: hovered > draft.fromDate ? hovered : draft.fromDate })
    expect(draft).toEqual({ fromDate: '2026-10-15', toDate: '' })
  })
  it('does not preview complete, missing or invalid endpoints', () => {
    expect(getCalendarPreviewRange({ fromDate: '2026-10-01', toDate: '2026-10-07' }, '2026-10-15')).toBeNull()
    for (const date of ['', 'invalid', '2026-02-30']) expect(getCalendarPreviewRange({ fromDate: date, toDate: '' }, '2026-10-15')).toBeNull()
    for (const date of [null, '', 'invalid', '2026-02-30']) expect(getCalendarPreviewRange({ fromDate: '2026-10-15', toDate: '' }, date)).toBeNull()
  })
  it('completes the same day twice and continues accepting future dates', () => {
    const draft = selectCalendarRangeDate({ fromDate: '2026-10-07', toDate: '2026-10-07' }, '2099-12-31')
    expect(draft).toEqual({ fromDate: '2099-12-31', toDate: '' })
    expect(selectCalendarRangeDate(draft, '2099-12-31')).toEqual({ fromDate: '2099-12-31', toDate: '2099-12-31' })
  })
  it.each([
    [{ fromDate: '', toDate: '2026-10-01' }, '2026-10-01'],
    [{ fromDate: 'invalid', toDate: '2026-08-10' }, '2026-08-01'],
    [{ fromDate: '2026-02-30', toDate: '2026-08-10' }, '2026-08-01'],
    [{ fromDate: '2026-08-10', toDate: '' }, '2026-08-01'],
    [{ fromDate: '', toDate: '' }, '2026-10-01'],
    [{ fromDate: 'invalid', toDate: 'invalid' }, '2026-10-01'],
  ] as const)('chooses a valid display month for draft %j without mutating it', (range, expected) => {
    const original = { ...range }
    const month = calendarMonthForRange(range, new Date('2026-09-30T19:01:00Z'))
    expect(month).toBe(expected)
    expect(buildCalendarMonth(month)).toHaveLength(42)
    expect(() => buildCalendarMonth(shiftCalendarMonth(month, 1))).not.toThrow()
    expect(range).toEqual(original)
  })

  it('uses the current Tashkent month only for display when neither draft endpoint is valid', () => {
    expect(calendarMonthForRange({ fromDate: '', toDate: '' }, new Date('2026-09-30T18:59:00Z')))
      .toBe('2026-09-01')
  })

  it('keeps the first date local until a complete range is selected', () => {
    const incomplete = selectCalendarRangeDate({
      fromDate: '2026-09-01',
      toDate: '2026-09-07',
    }, '2026-09-08')

    expect(incomplete).toEqual({ fromDate: '2026-09-08', toDate: '' })
    expect(selectCalendarRangeDate(incomplete, '2026-09-30')).toEqual({
      fromDate: '2026-09-08',
      toDate: '2026-09-30',
    })
  })

  it('normalizes an earlier second selection into an ordered range', () => {
    expect(selectCalendarRangeDate({
      fromDate: '2026-09-20',
      toDate: '',
    }, '2026-09-08')).toEqual({
      fromDate: '2026-09-08',
      toDate: '2026-09-20',
    })
  })

  it('builds stable month grids and navigates across year boundaries', () => {
    const september = buildCalendarMonth('2026-09-01')

    expect(september).toHaveLength(42)
    expect(september.filter((day) => day.inMonth).map((day) => day.date))
      .toEqual(Array.from({ length: 30 }, (_, index) =>
        `2026-09-${String(index + 1).padStart(2, '0')}`,
      ))
    expect(shiftCalendarMonth('2026-12-01', 1)).toBe('2027-01-01')
  })
})
