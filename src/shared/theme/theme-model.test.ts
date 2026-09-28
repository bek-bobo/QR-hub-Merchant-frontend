import { describe, expect, it } from 'vitest'
import {
  isThemeMode,
  normalizeThemeMode,
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
} from './theme-model'

describe('theme model', () => {
  it.each(['light', 'dark', 'system'] satisfies ThemeMode[])(
    'accepts the supported %s mode',
    (mode) => {
      expect(isThemeMode(mode)).toBe(true)
      expect(normalizeThemeMode(mode)).toBe(mode)
    },
  )

  it.each([undefined, null, '', 'auto', 'LIGHT', 1])(
    'normalizes invalid external value %s to system',
    (value) => {
      expect(isThemeMode(value)).toBe(false)
      expect(normalizeThemeMode(value)).toBe('system')
    },
  )

  it.each<{
    mode: ThemeMode
    prefersDark: boolean
    expected: ResolvedTheme
  }>([
    { mode: 'light', prefersDark: false, expected: 'light' },
    { mode: 'light', prefersDark: true, expected: 'light' },
    { mode: 'dark', prefersDark: false, expected: 'dark' },
    { mode: 'dark', prefersDark: true, expected: 'dark' },
    { mode: 'system', prefersDark: false, expected: 'light' },
    { mode: 'system', prefersDark: true, expected: 'dark' },
  ])(
    'resolves $mode with prefersDark=$prefersDark to $expected',
    ({ mode, prefersDark, expected }) => {
      expect(resolveTheme(mode, prefersDark)).toBe(expected)
    },
  )
})

