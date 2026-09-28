import { isThemeMode, type ThemeMode } from './theme-model'

type SetThemeMode = (mode: ThemeMode) => void

export function applyThemeModeSelection(
  value: string,
  setMode: SetThemeMode,
): void {
  if (isThemeMode(value)) setMode(value)
}

