import { useMemo, useSyncExternalStore } from 'react'

export interface MerchantPlotTheme {
  readonly dark: boolean
  readonly colors: readonly [string, string, string, string]
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

export function plotTooltipInteraction(theme: MerchantPlotTheme, anchored = false) {
  return {
    css: {
      // Persistent trend positioning lives in trend-tooltip.css: G2 overwrites inline left/top.
      '.g2-tooltip': { ...(anchored ? { transition: 'none' } : {}), 'box-sizing': 'border-box', background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, 'font-family': theme.fontFamily, 'border-radius': '12px', 'box-shadow': '0 8px 24px rgb(0 0 0 / 0.10)', padding: '12px', 'max-width': anchored ? 'min(280px, calc(100% - 16px))' : 'min(280px, calc(100vw - 32px))', 'font-size': '12px' },
      '.g2-tooltip-title': { color: theme.text, 'font-weight': '600', 'margin-bottom': '8px', 'white-space': 'normal' },
      '.g2-tooltip-list-item-name': { color: theme.secondary },
      '.g2-tooltip-list-item-value': { color: theme.text, 'font-weight': '600', 'font-variant-numeric': 'tabular-nums', 'text-align': 'right' },
    },
  }
}
