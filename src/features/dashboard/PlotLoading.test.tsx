import { dashboardZero, dashboardMetadata, nextDate, completedCoverage } from './test-fixtures'
import { Suspense } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineConfig, PieConfig } from '@ant-design/plots'
import type { DashboardView } from '@/shared/contracts/merchant-read'
import { TrendChart } from './TrendChart'
import { StatusDonut } from './StatusDonut'

const renderer = vi.hoisted(() => ({
  pending: new Promise<never>(() => {}),
  line: vi.fn<(props: LineConfig) => void>(),
  pie: vi.fn<(props: PieConfig) => void>(),
  dark: false,
}))

// Model an unresolved renderer without importing or testing the AntV engine.
vi.mock('./LazyPlotRenderers', () => ({
  TrendLinePlotRenderer: (props: LineConfig) => {
    renderer.line(props)
    throw renderer.pending
  },
  StatusPiePlotRenderer: (props: PieConfig) => {
    renderer.pie(props)
    throw renderer.pending
  },
}))
vi.mock('./plot-theme', async (importOriginal) => ({
  ...await importOriginal<typeof import('./plot-theme')>(),
  useMerchantPlotTheme: () => ({
    dark: renderer.dark, colors: ['blue', 'green', 'orange', 'red'],
    text: 'black', secondary: 'gray', axis: 'gray', grid: 'gray',
    surface: 'white', border: 'gray', fontFamily: 'Inter',
  }),
}))

function view(): DashboardView {
  const value = { count: 1, amount: { minorUnits: '10000', currency: 'UZS' as const, scale: 2 as const } }
  const metric = { ...value, countGrowthPct: null, amountGrowthPct: null }
  const total = { ...metric, count: 3, amount: { ...value.amount, minorUnits: '30000' } }
  const segment = { ...value, percent: 100 / 3 }
  return { ...dashboardMetadata,
    chartGroupBy: 'DAY',
    metrics: { uncategorized: dashboardZero, total, success: metric, processing: metric, failed: metric },
    pie: { uncategorized: dashboardZero, success: segment, processing: segment, failed: segment },
    buckets: [{ ...completedCoverage('2026-10-01', nextDate('2026-10-01')), label: 'A', periodKind: 'calendar', periodStart: '2026-10-01', periodEnd: nextDate('2026-10-01'),
      values: { uncategorized: dashboardZero, total, success: value, processing: value, failed: value } }],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  renderer.dark = false
})

describe('local plot loading boundaries', () => {
  it('keeps content, controls and exact accessible data outside pending visual viewports', () => {
    const data = view()
    const html = renderToStaticMarkup(
      <Suspense fallback={<p data-dashboard-loading>Dashboard loading</p>}>
        <p>KPI content</p>
        <TrendChart view={data} granularityControls={<button>Dashboard davri</button>} />
        <StatusDonut {...data} />
      </Suspense>,
    )
    expect(html).not.toContain('data-dashboard-loading')
    for (const text of ['KPI content', 'Tranzaksiyalar dinamikasi', 'Guruhlash: Kunlik',
      'Dashboard davri', 'Summa', 'Soni', 'Trend qatorlari', 'Grafik qatorlarini sozlash',
      'A: Jami: Soni: 3, Summa: 300.00 UZS', 'Statuslar taqsimoti',
      'Muvaffaqiyat ulushi', '100.00 UZS', 'Muvaffaqiyatli:', 'Jarayonda:', 'Muvaffaqiyatsiz:']) {
      expect(html).toContain(text)
    }
    expect(html).toContain('data-plot-loading="trend"')
    expect(html).toContain('h-80 w-full')
    expect(html).toContain('data-plot-loading="donut"')
    expect(html).toContain('h-52 w-full')
    expect(html).toMatch(/<p\b[^>]*text-text-primary[^>]*>3<\/p>/)
    expect(renderer.line).toHaveBeenCalled()
    expect(renderer.pie).toHaveBeenCalled()
  })

  it('never requests a renderer for empty plots', () => {
    const data = view()
    const emptyMetric = { ...data.metrics.total, count: 0, amount: { minorUnits: '0', currency: 'UZS' as const, scale: 2 as const } }
    const emptySegment = { ...emptyMetric, percent: 0 }
    const html = renderToStaticMarkup(<>
      <TrendChart view={{ ...data, buckets: [] }} />
      <StatusDonut metrics={{ uncategorized: dashboardZero, total: emptyMetric, success: emptyMetric, processing: emptyMetric, failed: emptyMetric }}
        pie={{ uncategorized: dashboardZero, success: emptySegment, processing: emptySegment, failed: emptySegment }} />
    </>)
    expect(html).toContain('Tanlangan davr uchun trend nuqtalari mavjud emas.')
    expect(html).toContain('data-empty="true"')
    expect(html).not.toContain('data-plot-loading')
    expect(renderer.line).not.toHaveBeenCalled()
    expect(renderer.pie).not.toHaveBeenCalled()
  })

  it('retains unavailable-chart feedback and reconciliation notes without invoking a renderer', () => {
    const data = view()
    const html = renderToStaticMarkup(<>
      <TrendChart view={data} plotUnavailable granularityControls={<button>Dashboard davri</button>}
        feedback={<p role="alert">Grafikni yuklab bo‘lmadi.</p>} />
      <StatusDonut pie={data.pie} metrics={{ ...data.metrics, total: { ...data.metrics.total, count: 4 } }} />
    </>)
    expect(html).toContain('Dashboard davri')
    expect(html).toContain('Grafikni yuklab bo‘lmadi.')
    expect(html).toContain('Ayrim holatlar ushbu taqsimotga kirmagan; foizlar ko‘rsatilmaydi.')
    expect(html).toContain('100.00 UZS')
    expect(renderer.line).not.toHaveBeenCalled()
    expect(renderer.pie).not.toHaveBeenCalled()
  })

  it.each([false, true])('passes the current parent theme/config while rendering is pending (dark=%s)', (dark) => {
    renderer.dark = dark
    const data = view()
    renderToStaticMarkup(<><TrendChart view={data} /><StatusDonut {...data} /></>)
    const theme = dark ? 'classicDark' : 'classic'
    expect(renderer.line.mock.calls[0]![0]).toMatchObject({ theme, height: 320, legend: false,
      scale: { color: { range: ['blue', 'green', 'orange', 'red'] } },
      shapeField: 'line' })
    expect(renderer.pie.mock.calls[0]![0]).toMatchObject({ theme, height: 208, legend: false,
      innerRadius: 0.72, scale: { color: { range: ['green', 'orange', 'red'] } } })
  })
})
