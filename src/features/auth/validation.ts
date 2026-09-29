import { normalizeUzbekPhoneWire } from '@/shared/presentation/phone'

const otpPattern = /^\d{6}$/
const pinPattern = /^\d{4,8}$/

export function normalizePhone(value: string): string | null {
  return normalizeUzbekPhoneWire(value, true)
}

export function isValidOtp(value: string): boolean {
  return otpPattern.test(value)
}

export function isValidPin(value: string): boolean {
  return pinPattern.test(value)
}
