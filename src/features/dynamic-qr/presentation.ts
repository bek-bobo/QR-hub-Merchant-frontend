import { useMemo } from 'react'
import { createMessages } from '@/shared/i18n/messages'
import { useLocale } from '@/shared/i18n/useLocale'
import { useMessages } from '@/shared/i18n/useMessages'
import { languageRegistry, type SupportedLocale } from '@/shared/i18n/registry'
import { createCalendarPresentation } from '@/shared/presentation/calendar'
import { presentQrStatus } from '@/shared/presentation/qr-status'
import { classifyQrStatusCode } from './contract'
import type { QrActionFeedback } from './feedback'

const statusKeys = { new: 'status.new', expired: 'status.expired', processing: 'status.processing', cancelled: 'status.cancelled', rejected: 'status.rejected', success: 'status.success', unknown: 'status.unknown' } as const
export function createDynamicQrPresentation(locale: SupportedLocale, messages: ReturnType<typeof createMessages<'dynamicQr'>>, common: ReturnType<typeof createMessages<'common'>>) {
  const intlLocale = languageRegistry[locale].intlLocale
  return {
    locale, intlLocale, ...createCalendarPresentation(locale),
    message: messages.message, critical: messages.critical, common: common.message,
    number: (value: number) => new Intl.NumberFormat(intlLocale).format(value),
    status: (code: number) => ({ ...presentQrStatus(code), label: messages.message(statusKeys[classifyQrStatusCode(code)]) }),
    feedback: (outcome: QrActionFeedback, context: 'create' | 'cancel' = 'create') => {
      const keys = { permission: 'feedback.permission', selection: 'feedback.selection', unavailable: 'feedback.unavailable', alreadySent: 'feedback.alreadySent', unknown: 'create.unknown', notSent: context === 'create' ? 'feedback.createNotSent' : 'cancel.notSent' } as const
      return messages.message(keys[outcome])
    },
  }
}
export type DynamicQrPresentation = ReturnType<typeof createDynamicQrPresentation>
export function useDynamicQrPresentation() {
  const { locale } = useLocale()
  const messages = useMessages('dynamicQr'), common = useMessages('common')
  return useMemo(() => createDynamicQrPresentation(locale, messages, common), [locale, messages, common])
}
