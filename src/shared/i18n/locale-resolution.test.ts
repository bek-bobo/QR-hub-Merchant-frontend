import { describe, expect, it, vi } from 'vitest'
import { normalizeLocale } from './registry'
import { browserLanguages, browserLocaleStorage, LOCALE_STORAGE_KEY, persistLocale, readPersistedLocale, resolveLocale } from './locale-resolution'

describe('locale normalization and resolution', () => {
  it.each([
    ['uz', 'uz'], ['uz-UZ', 'uz'], ['uz-Latn-UZ', 'uz'], ['ru-RU', 'ru'],
    ['RU', 'ru'], ['en-US', 'en'], ['en-GB', 'en'], ['en', 'en'],
    ['uz-Cyrl', null], ['uz-Cyrl-UZ', null], ['fr', null], ['en_US', null],
    ['en--US', null], ['', null], [' en', null], [null, null], [42, null],
    ['{"locale":"ru"}', null], ['"ru"', null], ['[invalid JSON', null],
  ])('normalizes %s to %s', (input, output) => expect(normalizeLocale(input)).toBe(output))

  it('uses selection, persisted, first supported browser preference, then uz', () => {
    expect(resolveLocale({ selection: 'ru', persisted: 'en', languages: ['uz'] })).toBe('ru')
    expect(resolveLocale({ selection: 'fr', persisted: 'en-GB', languages: ['ru'] })).toBe('en')
    expect(resolveLocale({ persisted: '{broken', languages: ['fr', 'uz-Cyrl', 'ru-RU', 'en'] })).toBe('ru')
    expect(resolveLocale({ languages: ['fr', 'uz-Cyrl'] })).toBe('uz')
    expect(resolveLocale()).toBe('uz')
  })

  it('stores only a plain canonical code under the versioned locale key', () => {
    const setItem = vi.fn()
    const storage = { getItem: () => 'ru-RU', setItem }
    expect(readPersistedLocale(storage)).toBe('ru')
    persistLocale(storage, 'en')
    expect(setItem.mock.calls).toEqual([[LOCALE_STORAGE_KEY, 'en']])
  })

  it('tolerates null and throwing storage reads/writes', () => {
    const storage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(readPersistedLocale(storage)).toBeNull()
    expect(readPersistedLocale(null)).toBeNull()
    expect(() => persistLocale(storage, 'en')).not.toThrow()
    expect(() => persistLocale(null, 'en')).not.toThrow()
  })

  it('handles absent navigator/window and a throwing localStorage getter', () => {
    vi.stubGlobal('navigator', undefined); vi.stubGlobal('window', undefined)
    try {
      expect(browserLanguages()).toEqual([])
      expect(browserLocaleStorage()).toBeNull()
      vi.stubGlobal('window', { get localStorage() { throw new Error('blocked') } })
      expect(browserLocaleStorage()).toBeNull()
    } finally { vi.unstubAllGlobals() }
  })
})
