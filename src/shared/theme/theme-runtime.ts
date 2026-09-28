import {
  normalizeThemeMode,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeMode,
} from './theme-model'

export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export interface ThemeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface ThemeRoot {
  classList: {
    toggle(token: string, force?: boolean): boolean
  }
  style: {
    colorScheme: string
  }
}

export interface ThemeState {
  mode: ThemeMode
  prefersDark: boolean
}

export type StorageThemeUpdate =
  | { kind: 'ignore' }
  | { kind: 'apply'; mode: ThemeMode }

export function readStoredThemeMode(storage: ThemeStorage | null): ThemeMode {
  if (!storage) return 'system'

  try {
    return normalizeThemeMode(storage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

export function persistThemeMode(
  storage: ThemeStorage | null,
  mode: ThemeMode,
): void {
  if (!storage) return

  try {
    storage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // The in-memory selection remains authoritative when storage is blocked.
  }
}

export function applyResolvedTheme(
  root: ThemeRoot,
  theme: ResolvedTheme,
): void {
  try {
    root.classList.toggle('dark', theme === 'dark')
  } catch {
    // Theme reconciliation must never prevent the application from running.
  }

  try {
    root.style.colorScheme = theme
  } catch {
    // Native-control theming is best effort when the root style is unavailable.
  }
}

export function resolveStorageThemeUpdate(
  key: string | null,
  newValue: string | null,
): StorageThemeUpdate {
  if (key !== THEME_STORAGE_KEY) return { kind: 'ignore' }
  return { kind: 'apply', mode: normalizeThemeMode(newValue) }
}

export function selectThemeMode(
  state: ThemeState,
  mode: ThemeMode,
  currentSystemPrefersDark: boolean,
): ThemeState {
  return {
    mode,
    prefersDark:
      mode === 'system' ? currentSystemPrefersDark : state.prefersDark,
  }
}

export function applySystemPreference(
  state: ThemeState,
  prefersDark: boolean,
): ThemeState {
  if (state.mode !== 'system' || state.prefersDark === prefersDark) return state
  return { ...state, prefersDark }
}

export function getBrowserThemeStorage(): ThemeStorage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function getSystemThemeQuery(): MediaQueryList | null {
  if (typeof window === 'undefined') return null

  try {
    if (typeof window.matchMedia !== 'function') return null
    return window.matchMedia(THEME_MEDIA_QUERY)
  } catch {
    return null
  }
}

export function readSystemPrefersDark(
  mediaQuery: Pick<MediaQueryList, 'matches'> | null = getSystemThemeQuery(),
): boolean {
  try {
    return mediaQuery?.matches === true
  } catch {
    return false
  }
}

export function getBrowserThemeRoot(): ThemeRoot | null {
  if (typeof document === 'undefined') return null

  try {
    return document.documentElement
  } catch {
    return null
  }
}

