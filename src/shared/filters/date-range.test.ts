import { describe, expect, it } from 'vitest'
import {
  getTashkentDatePreset,
  isIsoCalendarDate,
  isValidDateRange,
  toDateTerminalQuery,
} from './date-range'

describe('date range query helpers', () => {
  it('validates real calendar dates and ordered inclusive ranges', () => {
    expect(isIsoCalendarDate('2024-02-29')).toBe(true)
    expect(isIsoCalendarDate('2026-02-29')).toBe(false)
    expect(
      isValidDateRange({ fromDate: '2026-09-15', toDate: '2026-09-14' }),
    ).toBe(false)
  })

  it('omits blank terminal IDs and forbidden query fields', () => {
    expect(
      toDateTerminalQuery({
        fromDate: '2026-09-01',
        toDate: '2026-09-15',
        terminalId: '   ',
      }),
    ).toEqual({ fromDate: '2026-09-01', toDate: '2026-09-15' })
  })

  it('uses the Tashkent calendar date at a UTC boundary', () => {
    const instant = new Date('2026-09-14T20:30:00.000Z')

    expect(getTashkentDatePreset(1, instant)).toEqual({
      fromDate: '2026-09-15',
      toDate: '2026-09-15',
    })
    expect(getTashkentDatePreset(7, instant)).toEqual({
      fromDate: '2026-09-09',
      toDate: '2026-09-15',
    })
    expect(getTashkentDatePreset(30, instant)).toEqual({
      fromDate: '2026-08-17',
      toDate: '2026-09-15',
    })
  })
})
