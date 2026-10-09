import { presentActiveStatus } from '@/shared/presentation/active-status'
import { presentP5Status } from './page-state'
import { useMemo } from 'react'
import { createMessages } from '@/shared/i18n/messages'
import { useLocale } from '@/shared/i18n/useLocale'
import { useMessages } from '@/shared/i18n/useMessages'
import { languageRegistry, type SupportedLocale } from '@/shared/i18n/registry'
import { createCalendarPresentation } from '@/shared/presentation/calendar'

export function createP5Presentation(locale: SupportedLocale, messages: ReturnType<typeof createMessages<'p5'>>, common: ReturnType<typeof createMessages<'common'>>) {
  const intlLocale = languageRegistry[locale].intlLocale
  return {
    ...createCalendarPresentation(locale), intlLocale,
    message: messages.message, critical: messages.critical, common: common.message,
    qrStatus: (code: number) => ({ ...presentActiveStatus(code), label: messages.message(code === 0 ? 'status.qrActive' : 'status.qrUnknown') }),
    number: (value: number) => new Intl.NumberFormat(intlLocale).format(value),
    status: (code: number | null) => ({ ...presentP5Status(code), label: messages.message(code === 0 ? 'status.active' : code === 1 ? 'status.inactive' : 'status.unknown') }),
  }
}
export type P5Presentation = ReturnType<typeof createP5Presentation>
export function useP5Presentation() {
  const { locale } = useLocale()
  const messages = useMessages('p5'), common = useMessages('common')
  return useMemo(() => createP5Presentation(locale, messages, common), [locale, messages, common])
}
