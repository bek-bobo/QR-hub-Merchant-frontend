import { describe, expect, it } from 'vitest'
import {
  buildCalendarMonth,
  selectCalendarRangeDate,
  shiftCalendarMonth,
} from './date-range-calendar'

describe('date range calendar state', () => {
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
