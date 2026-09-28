const uzbekPhonePattern = /^998\d{9}$/

export function formatUzbekPhoneDisplay(
  value: string | null | undefined,
): string {
  const trimmed = value?.trim() ?? ''
  const digits = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed

  if (!uzbekPhonePattern.test(digits)) {
    return trimmed
  }

  return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
}
