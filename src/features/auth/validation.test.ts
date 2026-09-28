import { describe, expect, it } from 'vitest'
import { formatPhoneInput, isValidOtp, isValidPin, normalizePhone } from './validation'

describe('auth input validation', () => {
  it('accepts the exact Uzbekistan merchant phone shape', () => {
    expect(normalizePhone('998901234567')).toBe('998901234567')
    expect(normalizePhone('+998 (88) 810-17-98')).toBe('998888101798')
  })

  it.each([
    ['9', '9'],
    ['99', '99'],
    ['998', '998'],
    ['9988', '998 8'],
    ['99888', '998 88'],
    ['998888', '998 88 8'],
    ['9988881', '998 88 81'],
    ['99888810', '998 88 810'],
    ['998888101', '998 88 810 1'],
    ['9988881017', '998 88 810 17'],
    ['998888101798', '998 88 810 17 98'],
  ])('progressively displays %s as %s', (input, expected) => {
    expect(formatPhoneInput(input)).toBe(expected)
  })

  it('canonicalizes a pasted phone with allowed separators for display', () => {
    expect(formatPhoneInput('+998 (88) 810-17-98')).toBe('998 88 810 17 98')
  })

  it('rejects a wrong phone prefix', () => {
    expect(normalizePhone('997901234567')).toBeNull()
  })

  it('rejects a wrong phone length', () => {
    expect(normalizePhone('99890123456')).toBeNull()
    expect(normalizePhone('9989012345678')).toBeNull()
  })

  it('preserves a leading-zero OTP as a valid string', () => {
    expect(isValidOtp('001234')).toBe(true)
  })

  it('preserves a leading-zero PIN as a valid string', () => {
    expect(isValidPin('0012')).toBe(true)
  })
})
