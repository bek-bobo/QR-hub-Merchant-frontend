import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { ThemeContext, type ThemeContextValue } from './ThemeContext'
import { resolveTheme, type ThemeMode } from './theme-model'
import {
  applyResolvedTheme,
  applySystemPreference,
  getBrowserThemeRoot,
  getBrowserThemeStorage,
  getSystemThemeQuery,
  persistThemeMode,
  readStoredThemeMode,
  readSystemPrefersDark,
  resolveStorageThemeUpdate,
  selectThemeMode,
  type ThemeState,
} from './theme-runtime'

function createInitialThemeState(): ThemeState {
  const mode = readStoredThemeMode(getBrowserThemeStorage())

  return {
    mode,
    prefersDark: mode === 'system' ? readSystemPrefersDark() : false,
  }
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeState, setThemeState] = useState(createInitialThemeState)
  const resolvedTheme = resolveTheme(
    themeState.mode,
    themeState.prefersDark,
  )

  useLayoutEffect(() => {
    const root = getBrowserThemeRoot()
    if (root) applyResolvedTheme(root, resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (themeState.mode !== 'system') return

    const mediaQuery = getSystemThemeQuery()
    if (!mediaQuery) return

    const handleChange = (event: MediaQueryListEvent) => {
      setThemeState((current) =>
        applySystemPreference(current, event.matches),
      )
    }

    try {
      mediaQuery.addEventListener('change', handleChange)
    } catch {
      return
    }

    return () => {
      try {
        mediaQuery.removeEventListener('change', handleChange)
      } catch {
        // Cleanup remains best effort for partial browser implementations.
      }
    }
  }, [themeState.mode])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorage = (event: StorageEvent) => {
      const update = resolveStorageThemeUpdate(event.key, event.newValue)
      if (update.kind === 'ignore') return

      const prefersDark =
        update.mode === 'system' ? readSystemPrefersDark() : false
      setThemeState((current) =>
        selectThemeMode(current, update.mode, prefersDark),
      )
    }

    try {
      window.addEventListener('storage', handleStorage)
    } catch {
      return
    }

    return () => {
      try {
        window.removeEventListener('storage', handleStorage)
      } catch {
        // Cleanup remains best effort for partial browser implementations.
      }
    }
  }, [])

  const setMode = useCallback((mode: ThemeMode) => {
    const prefersDark = mode === 'system' ? readSystemPrefersDark() : false

    setThemeState((current) =>
      selectThemeMode(current, mode, prefersDark),
    )
    persistThemeMode(getBrowserThemeStorage(), mode)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ mode: themeState.mode, resolvedTheme, setMode }),
    [resolvedTheme, setMode, themeState.mode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

