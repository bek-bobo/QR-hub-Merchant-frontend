import { useMemo, useSyncExternalStore } from 'react'

export interface MerchantPlotTheme {
  readonly dark: boolean
  readonly colors: readonly [string, string, string, string]
  readonly areaTints: Readonly<Record<'success' | 'processing' | 'failed', string>>
  readonly text: string
  readonly secondary: string
  readonly axis: string
  readonly grid: string
  readonly surface: string
  readonly border: string
  readonly fontFamily: string
}

export function readMerchantPlotTheme(style: Pick<CSSStyleDeclaration, 'getPropertyValue' | 'fontFamily'>, dark: boolean): MerchantPlotTheme {
  const token = (name: string) => style.getPropertyValue(`--${name}`).trim()
  return {
    dark,
    colors: [token('status-info-indicator'), token('status-success-indicator'), token('status-warning-indicator'), token('status-error-indicator')],
    // Existing opaque semantic surfaces provide clean tints in each resolved theme.
    areaTints: { success: token('status-success-background'),
      processing: token('status-warning-background'), failed: token('status-error-background') },
    text: token('text-primary'), secondary: token('text-secondary'), axis: token('chart-axis'), grid: token('chart-grid'),
    surface: token('popover'), border: token('border'), fontFamily: style.fontFamily,
  }
}

function readAppliedDarkTheme(): boolean | null {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return null
  return document.documentElement.classList.contains('dark')
}

function subscribeToAppliedTheme(onChange: () => void): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return () => undefined
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function serverThemeSnapshot(): null {
  return null
}

export function useMerchantPlotTheme(): MerchantPlotTheme | null {
  // ThemeProvider applies the resolved class after render. Read tokens only from
  // that applied DOM theme, including system-mode changes, rather than stale context.
  const dark = useSyncExternalStore(subscribeToAppliedTheme, readAppliedDarkTheme, serverThemeSnapshot)
  return useMemo(() => {
    if (dark === null || typeof document === 'undefined' || typeof getComputedStyle !== 'function') return null
    return readMerchantPlotTheme(getComputedStyle(document.documentElement), dark)
  }, [dark])
}

export function plotTooltipInteraction(theme: MerchantPlotTheme) {
  return {
    css: {
      '.g2-tooltip': { background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, fontFamily: theme.fontFamily },
      '.g2-tooltip-title': { color: theme.text },
      '.g2-tooltip-list-item-name': { color: theme.secondary },
      '.g2-tooltip-list-item-value': { color: theme.text },
    },
  }
}
