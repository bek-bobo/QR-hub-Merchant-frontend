import { describe, expect, it, vi } from 'vitest'
import {
  applyResolvedTheme,
  applySystemPreference,
  getSystemThemeQuery,
  persistThemeMode,
  readStoredThemeMode,
  resolveStorageThemeUpdate,
  selectThemeMode,
  type ThemeState,
  type ThemeStorage,
} from './theme-runtime'

describe('theme persistence', () => {
  it.each([
    { stored: null, expected: 'system' },
    { stored: 'light', expected: 'light' },
    { stored: 'dark', expected: 'dark' },
    { stored: 'system', expected: 'system' },
    { stored: 'auto', expected: 'system' },
  ] as const)('reads $stored as $expected', ({ stored, expected }) => {
    const storage: ThemeStorage = {
      getItem: () => stored,
      setItem: () => undefined,
    }

    expect(readStoredThemeMode(storage)).toBe(expected)
  })

  it('defaults to system when storage is unavailable or throws', () => {
    const storage: ThemeStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => undefined,
    }

    expect(readStoredThemeMode(null)).toBe('system')
    expect(readStoredThemeMode(storage)).toBe('system')
  })

  it.each(['light', 'dark', 'system'] as const)(
    'persists an explicit %s selection',
    (mode) => {
      const setItem = vi.fn()

      persistThemeMode({ getItem: () => null, setItem }, mode)

      expect(setItem).toHaveBeenCalledOnce()
      expect(setItem).toHaveBeenCalledWith('qrhub:theme:v1', mode)
    },
  )

  it('does not throw when persistence is unavailable or blocked', () => {
    const storage: ThemeStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked')
      },
    }

    expect(() => persistThemeMode(null, 'dark')).not.toThrow()
    expect(() => persistThemeMode(storage, 'dark')).not.toThrow()
  })
})

describe('theme DOM application', () => {
  it.each([
    { theme: 'light', expectedDark: false },
    { theme: 'dark', expectedDark: true },
  ] as const)('applies $theme to the root', ({ theme, expectedDark }) => {
    const toggle = vi.fn(() => expectedDark)
    const style = { colorScheme: '' }

    applyResolvedTheme({ classList: { toggle }, style }, theme)

    expect(toggle).toHaveBeenCalledWith('dark', expectedDark)
    expect(style.colorScheme).toBe(theme)
  })

  it('keeps DOM failures from escaping theme reconciliation', () => {
    const root = {
      classList: {
        toggle: () => {
          throw new Error('blocked')
        },
      },
      style: {
        set colorScheme(_value: string) {
          throw new Error('blocked')
        },
        get colorScheme() {
          return ''
        },
      },
    }

    expect(() => applyResolvedTheme(root, 'dark')).not.toThrow()
  })
})

describe('cross-tab theme updates', () => {
  it.each([
    { value: 'light', expected: 'light' },
    { value: 'dark', expected: 'dark' },
    { value: 'system', expected: 'system' },
    { value: null, expected: 'system' },
    { value: 'invalid', expected: 'system' },
  ] as const)('applies matching key value $value', ({ value, expected }) => {
    expect(resolveStorageThemeUpdate('qrhub:theme:v1', value)).toEqual({
      kind: 'apply',
      mode: expected,
    })
  })

  it('ignores unrelated keys and clear events', () => {
    expect(resolveStorageThemeUpdate('auth', 'dark')).toEqual({ kind: 'ignore' })
    expect(resolveStorageThemeUpdate(null, null)).toEqual({ kind: 'ignore' })
  })
})

describe('theme state transitions', () => {
  const explicitDark: ThemeState = { mode: 'dark', prefersDark: false }

  it('uses a fresh preference when entering system mode', () => {
    expect(selectThemeMode(explicitDark, 'system', true)).toEqual({
      mode: 'system',
      prefersDark: true,
    })
  })

  it('ignores system preference changes in explicit modes', () => {
    expect(applySystemPreference(explicitDark, true)).toBe(explicitDark)
  })

  it('applies system preference changes in system mode', () => {
    expect(
      applySystemPreference({ mode: 'system', prefersDark: false }, true),
    ).toEqual({ mode: 'system', prefersDark: true })
  })
})

describe('system preference access', () => {
  it('returns no query when the matchMedia property accessor throws', () => {
    const windowStub = {}
    Object.defineProperty(windowStub, 'matchMedia', {
      get() {
        throw new Error('blocked')
      },
    })
    vi.stubGlobal('window', windowStub)

    try {
      expect(getSystemThemeQuery()).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

