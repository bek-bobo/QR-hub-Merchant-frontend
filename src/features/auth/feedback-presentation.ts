import type { LoginFeedback } from '@/shared/auth/feedback'
import type { MessageCatalog } from '@/shared/i18n/generated'
import type { createMessages } from '@/shared/i18n/messages'

const feedbackKeys = {
  invalidPhone: 'feedback.invalidPhone', invalidOtp: 'feedback.invalidOtp',
  invalidPin: 'feedback.invalidPin', pinMismatch: 'feedback.pinMismatch',
  otpNotExpired: 'feedback.otpNotExpired', otpExpired: 'feedback.otpExpired',
  wrongOtp: 'feedback.wrongOtp', wrongPin: 'feedback.wrongPin',
  sessionExpired: 'feedback.sessionExpired', blocked: 'feedback.blocked',
  rateLimited: 'feedback.rateLimited', unavailable: 'feedback.unavailable',
  contract: 'feedback.contract', request: 'feedback.request',
  completing: 'feedback.completing', complete: 'feedback.complete',
  ownerBusy: 'feedback.ownerBusy', browserUnsupported: 'feedback.browserUnsupported',
  deviceStorageUnavailable: 'feedback.deviceStorageUnavailable',
} as const satisfies Record<LoginFeedback, keyof MessageCatalog['auth']>

export function presentLoginFeedback(feedback: LoginFeedback, messages: ReturnType<typeof createMessages<'auth'>>): string {
  // Defend the presentation boundary against untyped/unknown fixture or server data.
  const key = Object.hasOwn(feedbackKeys, feedback) ? feedbackKeys[feedback] : 'feedback.request'
  return messages.message(key)
}
