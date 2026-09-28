const phonePattern = /^998\d{9}$/
const otpPattern = /^\d{6}$/
const pinPattern = /^\d{4,8}$/

export function formatPhoneInput(value: string): string {
  const compact = value.replace(/[+\s().-]/g, '')
  const groups: string[] = []
  let offset = 0

  for (const width of [3, 2, 3, 2, 2]) {
    if (offset >= compact.length) {
      break
    }
    groups.push(compact.slice(offset, offset + width))
    offset += width
  }

  if (offset < compact.length) {
    groups.push(compact.slice(offset))
  }

  return groups.join(' ')
}

export function normalizePhone(value: string): string | null {
  const normalized = value.replace(/[+\s().-]/g, '')
  return phonePattern.test(normalized) ? normalized : null
}

export function isValidOtp(value: string): boolean {
  return otpPattern.test(value)
}

export function isValidPin(value: string): boolean {
  return pinPattern.test(value)
}
