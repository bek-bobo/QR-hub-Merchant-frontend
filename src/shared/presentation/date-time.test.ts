import { describe, expect, it, vi } from 'vitest'
import { formatInstantTime, formatOffsetlessDateTime } from './date-time'

describe('date-time presentation', () => {
  it.each([
    ['2026-10-15T09:48:00', '15.10.2026 09:48'],
    ['2026-10-15T09:47:00', '15.10.2026 09:47'],
    ['2026-01-02T03:04', '02.01.2026 03:04'],
    ['2026-01-02 03:04', '02.01.2026 03:04'],
    ['2026-01-01T00:00:00', '01.01.2026 00:00'],
    ['2026-12-31T23:59:59.999999999', '31.12.2026 23:59'],
    ['2027-01-01T00:00:00', '01.01.2027 00:00'],
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
    '2026-09-25T13:02:31+05:00',
    '2026-09-25T23:59:59-11:00',
    '2026-01-02T03:04Z',
    '2026-01-02T03:04:60',
    '2026-01-02T03:60:00',
    '2026-01-02T03:04.123',
    '2026-04-31T03:04:00',
    '2026-01-02',
    '1792043280000',
    'not-a-date',
  ])('preserves malformed or zoned value %s neutrally', (value) => {
    expect(formatOffsetlessDateTime(value)).toBe(value)
  })

  it.each([null, undefined, ''])('preserves the empty placeholder for %s', value => {
    expect(formatOffsetlessDateTime(value)).toBe('—')
  })

  it.each(['Pacific/Honolulu', 'Asia/Tashkent', 'Pacific/Kiritimati'])('preserves backend wall time independently of host timezone %s', timezone => {
    vi.stubEnv('TZ', timezone)
    try {
      expect(formatOffsetlessDateTime('2026-12-31T23:59:59')).toBe('31.12.2026 23:59')
      expect(formatOffsetlessDateTime('2027-01-01T00:00')).toBe('01.01.2027 00:00')
    } finally { vi.unstubAllEnvs() }
  })

  it('keeps real epoch formatting on a separate explicit pathway', () => {
    expect(formatInstantTime(0, { locale: 'en-GB', timeZone: 'UTC' })).toBe('00:00:00')
  })
})
