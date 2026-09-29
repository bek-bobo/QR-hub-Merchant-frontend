const UZBEK_PHONE_PREFIX = '998'
const UZBEK_LOCAL_PHONE_PATTERN = /^\d{9}$/
const uzbekPhonePattern = /^998\d{9}$/

export function formatUzbekLocalPhone(value: string): string {
  if (!/^\d{0,9}$/.test(value)) return value

  const groups: string[] = []
  let offset = 0
  for (const width of [2, 3, 2, 2]) {
    if (offset >= value.length) break
    groups.push(value.slice(offset, offset + width))
    offset += width
  }
  return groups.join(' ')
}

export function parseUzbekPhoneInput(value: string): string | null {
  if (!/^[+\d\s().-]*$/.test(value)) return null

  const compact = value.replace(/[\s().-]/g, '')
  if (compact.startsWith('+')) {
    if (!compact.startsWith(`+${UZBEK_PHONE_PREFIX}`)) return null
    const localDigits = compact.slice(4)
    return /^\d{0,9}$/.test(localDigits) ? localDigits : null
  }
  if (!/^\d*$/.test(compact)) return null
  if (compact.length === 12) {
    return compact.startsWith(UZBEK_PHONE_PREFIX) ? compact.slice(3) : null
  }
  return compact.length <= 9 ? compact : null
}

export function toUzbekPhoneWire(localDigits: string): string | null {
  return UZBEK_LOCAL_PHONE_PATTERN.test(localDigits)
    ? `${UZBEK_PHONE_PREFIX}${localDigits}`
    : null
}

export function normalizeUzbekPhoneWire(
  value: string,
  allowSeparators: boolean,
): string | null {
  const trimmed = value.trim()
  const normalized = allowSeparators
    ? trimmed.replace(/[+\s().-]/g, '')
    : trimmed.startsWith('+') ? trimmed.slice(1) : trimmed
  return uzbekPhonePattern.test(normalized) ? normalized : null
}

export function formatUzbekPhoneDisplay(
  value: string | null | undefined,
): string {
  const trimmed = value?.trim() ?? ''
  const digits = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed

  if (!uzbekPhonePattern.test(digits)) {
    return trimmed
  }

  return `+${UZBEK_PHONE_PREFIX} ${formatUzbekLocalPhone(digits.slice(3))}`
}
