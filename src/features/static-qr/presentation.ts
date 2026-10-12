import { presentActiveStatus } from '@/shared/presentation/active-status'
import { useMemo } from 'react'
import { createMessages } from '@/shared/i18n/messages'
import { useLocale } from '@/shared/i18n/useLocale'
import { useMessages } from '@/shared/i18n/useMessages'
import { languageRegistry, type SupportedLocale } from '@/shared/i18n/registry'
import { createCalendarPresentation } from '@/shared/presentation/calendar'

export function createStaticQrPresentation(locale: SupportedLocale, messages: ReturnType<typeof createMessages<'staticQr'>>, common: ReturnType<typeof createMessages<'common'>>) {
  const intlLocale = languageRegistry[locale].intlLocale
  return {
    ...createCalendarPresentation(locale), intlLocale,
    message: messages.message, critical: messages.critical, common: common.message,
    number: (value: number) => new Intl.NumberFormat(intlLocale).format(value),
    status: (code: number) => ({ ...presentActiveStatus(code), label: messages.message(code === 0 ? 'status.active' : 'status.unknown') }),
  }
}
export type StaticQrPresentation = ReturnType<typeof createStaticQrPresentation>
export function useStaticQrPresentation() {
  const { locale } = useLocale()
  const messages = useMessages('staticQr'), common = useMessages('common')
  return useMemo(() => createStaticQrPresentation(locale, messages, common), [locale, messages, common])
}
