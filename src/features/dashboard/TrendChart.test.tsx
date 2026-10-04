import { Children, isValidElement, type ReactNode, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineConfig } from '@ant-design/plots'
import type { DashboardView } from '@/shared/contracts/merchant-read'
import { TrendChart } from './TrendChart'
import { ALL_TREND_SERIES, toggleTrendSeries, type TrendSeriesKey } from './trend-presentation'

const harness = vi.hoisted(() => ({ mode: 'count' as 'count' | 'amount', visible: ['total', 'success', 'processing', 'failed'] as TrendSeriesKey[], configs: [] as LineConfig[], query: vi.fn() }))
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual,
    useState: (initial: unknown) => initial === 'count'
      ? [harness.mode, (next: 'count' | 'amount') => { harness.mode = next }]
      : actual.useState(initial),
  }
})
vi.mock('./useTrendSeriesPreferences', () => ({ useTrendSeriesPreferences: () => ({
  visible: harness.visible,
  toggle: (key: TrendSeriesKey) => { harness.visible = [...toggleTrendSeries(harness.visible, key)] },
}) }))
vi.mock('./LazyPlotRenderers', () => ({ TrendLinePlotRenderer: (props: LineConfig) => { harness.configs.push(props); return <div data-plot="line" /> } }))
vi.mock('./plot-theme', async (importOriginal) => ({ ...await importOriginal<typeof import('./plot-theme')>(),
  useMerchantPlotTheme: () => ({ dark: false, colors: ['blue', 'green', 'orange', 'red'], areaTints: { success: 'success-tint', processing: 'warning-tint', failed: 'error-tint' }, text: 'black', secondary: 'gray', axis: 'gray', grid: 'gray', surface: 'white', border: 'gray', fontFamily: 'Inter' }),
}))
vi.mock('@tanstack/react-query', () => ({ useQuery: harness.query }))

function view(): DashboardView {
  const raw = { count: 1, amount: { minorUnits: '900719925474099301', currency: 'UZS' as const, scale: 2 as const } }
  const metric = { ...raw, countGrowthPct: null, amountGrowthPct: null }
  const segment = { ...raw, percent: 25 }
  return { chartGroupBy: 'DAY', metrics: { total: metric, success: metric, processing: metric, failed: metric },
    pie: { success: segment, processing: segment, failed: segment }, buckets: ['A', 'B'].map((label) => ({ label,
      periodKind: 'calendar' as const, periodStart: '2026-10-01', periodEnd: '2026-10-01', values: { total: raw, success: raw, processing: raw, failed: raw } })) }
}
function find(node: unknown, predicate: (element: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = find(child, predicate)
      if (found) return found
    }
    return undefined
  }
  // Renderer props can contain configuration objects under `children`.
  // Only React elements and arrays form a traversable Merchant element tree.
  if (!isValidElement<Record<string, unknown>>(node)) return undefined
  if (predicate(node)) return node
  return find(node.props.children, predicate)
}
function click(label: string) {
  const button = find(TrendChart({ view: view() }), (element) => element.props['aria-label'] === label || element.props.children === label)!
  const handler = button.props.onClick as () => void
  handler()
}
function toggleSeries(key: TrendSeriesKey) {
  const settings = find(TrendChart({ view: view() }), (element) => typeof element.props.onToggle === 'function')!
  const toggle = settings.props.onToggle as (key: TrendSeriesKey) => void
  toggle(key)
}
function legend(html: string) {
  return html.match(/<ul aria-label="Trend qatorlari"[^>]*>(.*?)<\/ul>/)?.[1] ?? ''
}
beforeEach(() => { harness.mode = 'count'; harness.visible = [...ALL_TREND_SERIES]; harness.configs = []; vi.clearAllMocks() })

describe('Merchant TrendChart integration', () => {
  it('uses Line inside Merchant UI with four visible series and no legacy SVG or table', () => {
    const html = renderToStaticMarkup(<TrendChart view={view()} />)
    expect(html).toContain('data-plot="line"')
    expect(html).toContain('Tranzaksiyalar dinamikasi')
    expect(html).toContain('Tranzaksiyalar soni')
    expect(html).toMatch(/aria-pressed="true"[^>]*>Soni/)
    expect(html).not.toMatch(/<table|Batafsil ma’lumotlar|min-width|overflow-x-auto/)
    // Inspect only Merchant's own tree: nested Lucide components may render SVG.
    expect(find(TrendChart({ view: view() }), (element) => element.type === 'svg')).toBeUndefined()
    for (const label of ['Jami', 'Muvaffaqiyatli', 'Jarayonda', 'Muvaffaqiyatsiz']) expect(legend(html)).toContain(label)
    expect(legend(html)).not.toContain('<button')
    expect(html).toContain('Grafik qatorlarini sozlash')
    expect(harness.configs[0]!.legend).toBe(false)
    expect(harness.query).not.toHaveBeenCalled()
  })

  it('switches modes and hides/restores series locally, preserving state across date data changes', () => {
    click('Summa')
    toggleSeries('total')
    renderToStaticMarkup(<TrendChart view={view()} />)
    const config = harness.configs.at(-1)!
    expect((config.data as { key: string }[]).every(({ key }) => key !== 'total')).toBe(true)
    expect(harness.visible).toEqual(['success', 'processing', 'failed'])
    const updated = { ...view(), chartGroupBy: 'MONTH' as const }
    const html = renderToStaticMarkup(<TrendChart view={updated} />)
    expect(html).toContain('Summa (UZS)')
    expect(html).toContain('Guruhlash: Oylik')
    expect(legend(html)).not.toContain('Jami')
    expect(legend(html)).toContain('Muvaffaqiyatli (9 007 199 254 740 993.01 UZS)')
    expect(legend(html)).not.toContain('Muvaffaqiyatli (1)')
    toggleSeries('total')
    expect(harness.visible).toEqual(ALL_TREND_SERIES)
    click('Soni')
    expect(harness.mode).toBe('count')
    const countHtml = renderToStaticMarkup(<TrendChart view={updated} />)
    expect(legend(countHtml)).toContain('Muvaffaqiyatli (1)')
    expect(legend(countHtml)).not.toContain('UZS')
    toggleSeries('failed')
    click('Summa')
    click('Soni')
    expect(harness.visible).toEqual(['total', 'success', 'processing'])
    expect(harness.query).not.toHaveBeenCalled()
  })

  it('prevents hiding the final series and keeps exact nonvisual data for hidden series', () => {
    harness.visible = ['success']
    toggleSeries('success')
    expect(harness.visible).toEqual(['success'])
    const html = renderToStaticMarkup(<TrendChart view={view()} />)
    expect(html).toContain('class="sr-only"')
    expect(html).toContain('Jami: Soni: 1, Summa: 9 007 199 254 740 993.01 UZS')
    expect(html).toContain('B: Jami:')
  })

  it.each([['HOUR', 'Soatlik'], ['DAY', 'Kunlik'], ['WEEK', 'Haftalik'], ['MONTH', 'Oylik'], ['YEAR', 'Yillik']] as const)('displays %s grouping as read-only %s', (chartGroupBy, label) => {
    const base = view()
    const data: DashboardView = { ...base, chartGroupBy, buckets: chartGroupBy === 'HOUR'
      ? base.buckets.map((bucket, index) => ({ ...bucket, periodKind: 'hour', label: `01.10.2026 ${14 + index}:00`,
        periodStart: `2026-10-01T${14 + index}:00:00+05:00`, periodEnd: `2026-10-01T${15 + index}:00:00+05:00` }))
      : base.buckets }
    const indicator = find(TrendChart({ view: data }), (element) => element.type === 'p' && Children.toArray(element.props.children as ReactNode).includes('Guruhlash: '))!
    expect(indicator.props.onClick).toBeUndefined()
    const html = renderToStaticMarkup(<TrendChart view={data} />)
    expect(html).toContain(`Guruhlash: ${label}`)
  })

  it('keeps date controls and contained feedback while withholding an unavailable plot', () => {
    const html = renderToStaticMarkup(<TrendChart view={view()} plotUnavailable rangeControls={<button>Dashboard davri</button>} feedback={<p role="status">Grafik yuklanmoqda</p>} />)
    expect(html).toContain('Dashboard davri')
    expect(html).toContain('Grafik yuklanmoqda')
    expect(html).not.toContain('data-plot="line"')
    expect(html).not.toContain('Guruhlash:')
    expect(renderToStaticMarkup(<TrendChart view={{ ...view(), buckets: [] }} />)).toContain('Tanlangan davr uchun trend nuqtalari mavjud emas.')
  })
})
