import { createDashboardPresentation } from './presentation'
import { localeMessages } from '@/test/locale-fixture'
const presentation = createDashboardPresentation('uz', localeMessages('dashboard'))
import { dashboardZero } from './test-fixtures'
import { createElement } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyResolvedTheme, applySystemPreference } from '@/shared/theme/theme-runtime'
import { resolveTheme } from '@/shared/theme/theme-model'
import { ALL_TREND_SERIES, createTrendPlotConfig } from './trend-presentation'
import { createDonutPlotConfig } from './donut-presentation'
import { plotTooltipInteraction, readMerchantPlotTheme, useMerchantPlotTheme, type MerchantPlotTheme } from './plot-theme'

const store = vi.hoisted(() => ({
  server: false,
  subscribe: null as ((notify: () => void) => () => void) | null,
}))

// Exercise the hook's snapshots and subscription without requiring a browser renderer.
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useSyncExternalStore: (subscribe: typeof store.subscribe, snapshot: () => unknown, serverSnapshot: () => unknown) => {
    store.subscribe = subscribe
    return store.server ? serverSnapshot() : snapshot()
  },
}))

function ThemeProbe() {
  const theme = useMerchantPlotTheme()
  return createElement('script', {
    type: 'application/json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(theme) },
  })
}

function renderTheme(): MerchantPlotTheme | null {
  const html = renderToStaticMarkup(createElement(ThemeProbe))
  return JSON.parse(html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'))) as MerchantPlotTheme | null
}

afterEach(() => {
  store.server = false
  store.subscribe = null
  vi.unstubAllGlobals()
})

describe('Merchant plot theme adapter', () => {
  it.each([false, true])('reads resolved Merchant tokens without importing Admin palettes (dark=%s)', (dark) => {
    const theme = readMerchantPlotTheme({ fontFamily: 'Merchant font', getPropertyValue: (name) => ` ${name}:${dark} ` }, dark)
    expect(theme.colors).toEqual(['--status-info-indicator', '--status-success-indicator', '--status-warning-indicator', '--status-error-indicator'].map((name) => `${name}:${dark}`))
    expect(theme.fontFamily).toBe('Merchant font')
    expect(theme.dark).toBe(dark)
    expect(theme.axis).toBe(`--chart-axis:${dark}`)
    expect(theme.grid).toBe(`--chart-grid:${dark}`)
    expect(plotTooltipInteraction(theme).css['.g2-tooltip']).toMatchObject({ background: `--popover:${dark}`, color: `--text-primary:${dark}` })
  })

  it('reads tokens after applied light/dark and system theme changes, and cleans up its subscription', () => {
    let dark = false
    let mutation: (() => void) | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()
    const root = {
      classList: { contains: () => dark, toggle: (_token: string, force?: boolean) => { dark = Boolean(force); return dark } },
      style: { colorScheme: 'light' },
    }
    vi.stubGlobal('document', { documentElement: root })
    vi.stubGlobal('getComputedStyle', () => ({
      fontFamily: 'Merchant font',
      getPropertyValue: (name: string) => `${name}:${dark}`,
    }))
    vi.stubGlobal('MutationObserver', class {
      constructor(callback: () => void) { mutation = callback }
      observe = observe
      disconnect = disconnect
    })
    const light = renderTheme()!
    const amount = { minorUnits: '0', currency: 'UZS' as const, scale: 2 as const }
    const metric = { count: 0, amount, countGrowthPct: null, amountGrowthPct: null }
    const segment = { count: 0, amount, percent: 0 }
    const donutView = { metrics: { uncategorized: dashboardZero, total: metric, success: metric, processing: metric, failed: metric },
      pie: { uncategorized: dashboardZero, success: segment, processing: segment, failed: segment } }
    const notify = vi.fn()
    const unsubscribe = store.subscribe!(notify)
    expect(observe).toHaveBeenCalledWith(root, { attributes: true, attributeFilter: ['class'] })
    for (const resolved of ['dark', 'light'] as const) {
      applyResolvedTheme(root, resolved)
      mutation!()
      const theme = renderTheme()!
      expect(theme.dark).toBe(resolved === 'dark')
      expect(theme.colors).toEqual(['info', 'success', 'warning', 'error'].map((status) => `--status-${status}-indicator:${theme.dark}`))
      const config = createTrendPlotConfig(presentation, { buckets: [] }, 'count', ALL_TREND_SERIES, theme)
      expect(config.theme).toBe(theme.dark ? 'classicDark' : 'classic')
      expect(config.scale?.color).toMatchObject({ range: theme.colors })
      expect(config.axis).toMatchObject({ x: { lineStroke: theme.axis }, y: { gridStroke: theme.grid } })
      const donut = createDonutPlotConfig(presentation, donutView, theme)
      expect(donut.theme).toBe(config.theme)
      expect(donut.scale?.color).toMatchObject({ range: theme.colors.slice(1) })
      expect(donut.interaction?.tooltip).toEqual(plotTooltipInteraction(theme))
    }
    for (const prefersDark of [true, false]) {
      const state = applySystemPreference({ mode: 'system', prefersDark: !prefersDark }, prefersDark)
      applyResolvedTheme(root, resolveTheme(state.mode, state.prefersDark))
      mutation!()
      expect(renderTheme()!.dark).toBe(prefersDark)
    }
    expect(notify).toHaveBeenCalledTimes(4)
    expect(renderTheme()).toEqual(light)
    unsubscribe()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('returns null safely without browser globals or computed styles', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('getComputedStyle', undefined)
    vi.stubGlobal('MutationObserver', undefined)
    expect(renderTheme()).toBeNull()
    expect(() => store.subscribe!(() => undefined)()).not.toThrow()
    vi.stubGlobal('document', { documentElement: {} })
    expect(renderTheme()).toBeNull()
  })

  it('uses a null server snapshot even when browser globals exist', () => {
    store.server = true
    const computedStyle = vi.fn()
    vi.stubGlobal('document', { documentElement: {} })
    vi.stubGlobal('getComputedStyle', computedStyle)
    expect(renderTheme()).toBeNull()
    expect(computedStyle).not.toHaveBeenCalled()
  })
})
