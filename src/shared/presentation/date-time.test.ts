import { describe, expect, it } from 'vitest'
import { formatInstantTime, formatOffsetlessDateTime } from './date-time'

describe('date-time presentation', () => {
  it.each([
    ['2026-09-25T13:02:31.057708', '25.09.2026 13:02'],
    ['2026-09-25 13:02:31.057708', '25.09.2026 13:02'],
    ['2026-09-25T13:02:31', '25.09.2026 13:02'],
    ['2026-09-25 13:02:31', '25.09.2026 13:02'],
    ['2024-02-29T23:30:00', '29.02.2024 23:30'],
  ])('formats offsetless backend value %s lexically', (value, expected) => {
    const source = value
    expect(formatOffsetlessDateTime(value)).toBe(expected)
    expect(value).toBe(source)
  })

  it.each([
    '2023-02-29T13:02:31',
    '2026-13-25T13:02:31',
    '2026-09-25T25:02:31',
    '2026-09-25T13:02:31Z',
    'not-a-date',
  ])('preserves malformed or zoned value %s neutrally', (value) => {
    expect(formatOffsetlessDateTime(value)).toBe(value)
  })

  it('keeps real epoch formatting on a separate explicit pathway', () => {
    expect(formatInstantTime(0, { locale: 'en-GB', timeZone: 'UTC' })).toBe('00:00:00')
  })
})
