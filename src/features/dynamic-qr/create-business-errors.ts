// Only source-proven rejections may bypass the indeterminate mutation fallback.
// Bank-account validation runs before the backend calls core QR creation.
const businessErrors = {
  BANK_ACCOUNT_STATUS_IS_NOT_ACTIVE: {
    code: 10023,
    message: 'create.bankAccountInactive',
    guidance: 'create.bankAccountInactiveGuidance',
  },
} as const

export function getCreateBusinessError(reason: string) {
  return reason === 'BANK_ACCOUNT_STATUS_IS_NOT_ACTIVE'
    ? businessErrors.BANK_ACCOUNT_STATUS_IS_NOT_ACTIVE : null
}

export function decodeCreateBusinessRejection(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const envelope = payload as Record<string, unknown>
  if (envelope.success !== false || envelope.data !== null ||
    !envelope.error || typeof envelope.error !== 'object' || Array.isArray(envelope.error)) return null
  const error = envelope.error as Record<string, unknown>
  if (typeof error.tag !== 'string' || typeof error.text !== 'string' || !error.text.trim()) return null
  const known = getCreateBusinessError(error.tag)
  // The tag is the primary key; a mismatched/missing code is not a proven rejection.
  // Validate text shape, but never retain/render the server's arbitrary wording.
  return known && error.code === known.code ? error.tag : null
}
