import { presentActiveStatus } from '@/shared/presentation/active-status'
import { presentCashierTerminalStatus } from './status-presentation'
import { useMemo } from 'react'
import { createMessages } from '@/shared/i18n/messages'
import { useLocale } from '@/shared/i18n/useLocale'
import { useMessages } from '@/shared/i18n/useMessages'
import { languageRegistry, type SupportedLocale } from '@/shared/i18n/registry'
import { createCalendarPresentation } from '@/shared/presentation/calendar'
import { cashierFeedbackKeys, type CashierFeedback } from './feedback'

export function createCashierPresentation(locale: SupportedLocale, messages: ReturnType<typeof createMessages<'cashiers'>>, common: ReturnType<typeof createMessages<'common'>>) {
  const intlLocale = languageRegistry[locale].intlLocale
  return {
    ...createCalendarPresentation(locale), intlLocale,
    message: messages.message, critical: messages.critical, common: common.message,
    feedback: (kind: CashierFeedback) => messages.message(cashierFeedbackKeys[kind]),
    number: (value: number) => new Intl.NumberFormat(intlLocale).format(value),
    status: (code: number) => ({ ...presentActiveStatus(code), label: messages.message(code === 0 ? 'status.active' : 'status.unknown') }),
    assignmentStatus: (code: number) => ({ ...presentCashierTerminalStatus(code), label: messages.message(code === 0 ? 'status.active' : code === 1 ? 'status.inactive' : 'status.unknown') }),
  }
}
export type CashierPresentation = ReturnType<typeof createCashierPresentation>
export function useCashierPresentation() {
  const { locale } = useLocale()
  const messages = useMessages('cashiers'), common = useMessages('common')
  return useMemo(() => createCashierPresentation(locale, messages, common), [locale, messages, common])
}
