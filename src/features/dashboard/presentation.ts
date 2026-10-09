import { useMemo } from 'react'
import { createMessages } from '@/shared/i18n/messages'
import { useLocale } from '@/shared/i18n/useLocale'
import { useMessages } from '@/shared/i18n/useMessages'
import { languageRegistry, type SupportedLocale } from '@/shared/i18n/registry'
import type { Outcome } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { createCalendarPresentation } from '@/shared/presentation/calendar'

export function createDashboardPresentation(locale: SupportedLocale, messages: ReturnType<typeof createMessages<'dashboard'>>) {
  const intlLocale = languageRegistry[locale].intlLocale
  const number = (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(intlLocale, options).format(value)
  const calendar = createCalendarPresentation(locale)
  const labels = { total: 'metrics.total', success: 'metrics.success', processing: 'metrics.processing', failed: 'metrics.failed', uncategorized: 'metrics.uncategorized' } as const
  return {
    locale, intlLocale, message: messages.message, number, ...calendar,
    label: (key: Outcome) => messages.message(labels[key]),
    percent: (value: number | null, signed = false) => value === null ? '—' : `${signed && value > 0 ? '+' : ''}${number(value, { maximumFractionDigits: 2 })}%`,
    // Preserve the established exact representation, ISO currency and scale.
    // No minor-unit value is converted to Number for financial presentation.
    money: formatMoney,
  }
}
export type DashboardPresentation = ReturnType<typeof createDashboardPresentation>

export function useDashboardPresentation(): DashboardPresentation {
  const { locale } = useLocale()
  const messages = useMessages('dashboard')
  // Resolve through the stable guarded facade; rebuild presentation callbacks
  // when the committed locale changes.
  return useMemo(() => createDashboardPresentation(locale, messages), [locale, messages])
}
