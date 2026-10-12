import languages from './languages.json'

export const languageRegistry = languages
export type SupportedLocale = keyof typeof languageRegistry
export const DEFAULT_LOCALE: SupportedLocale = 'uz'
export const CANONICAL_LOCALE = DEFAULT_LOCALE
export const supportedLocales = Object.keys(languageRegistry).filter(
  (code): code is SupportedLocale => code in languageRegistry && languageRegistry[code as SupportedLocale].enabled,
)

export function normalizeLocale(value: unknown): SupportedLocale | null {
  if (typeof value !== 'string' || !value || value !== value.trim()) return null
  try {
    const tag = Intl.getCanonicalLocales(value)[0]
    // Explicit aliases only: in particular, uz-Cyrl must never become Latin Uzbek.
    return supportedLocales.find((code) =>
      languageRegistry[code].aliases.some((alias) => alias.toLowerCase() === tag.toLowerCase()),
    ) ?? null
  } catch {
    return null
  }
}
