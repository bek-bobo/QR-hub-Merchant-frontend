import { DEFAULT_LOCALE, normalizeLocale, type SupportedLocale } from './registry'

export const LOCALE_STORAGE_KEY = 'qrhub:locale:v1'
export interface LocaleStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function browserLocaleStorage(): LocaleStorage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null }
}

export function readPersistedLocale(storage: LocaleStorage | null): SupportedLocale | null {
  try { return normalizeLocale(storage?.getItem(LOCALE_STORAGE_KEY)) } catch { return null }
}

export function persistLocale(storage: LocaleStorage | null, locale: SupportedLocale): void {
  try { storage?.setItem(LOCALE_STORAGE_KEY, locale) } catch { /* Memory remains authoritative. */ }
}

export function browserLanguages(): readonly string[] {
  try { return typeof navigator === 'undefined' ? [] : navigator.languages } catch { return [] }
}

export function resolveLocale(options: {
  selection?: unknown
  persisted?: unknown
  languages?: readonly unknown[]
} = {}): SupportedLocale {
  return normalizeLocale(options.selection) ?? normalizeLocale(options.persisted)
    ?? options.languages?.map(normalizeLocale).find((code) => code !== null) ?? DEFAULT_LOCALE
}
