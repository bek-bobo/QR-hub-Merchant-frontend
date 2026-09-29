import { describe, expect, it } from 'vitest'
import { isValidOtp, isValidPin, normalizePhone } from './validation'

describe('auth input validation', () => {
  it('accepts the exact Uzbekistan merchant phone shape', () => {
    expect(normalizePhone('998901234567')).toBe('998901234567')
    expect(normalizePhone('+998 (88) 810-17-98')).toBe('998888101798')
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
