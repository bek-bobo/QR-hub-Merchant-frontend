import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { DashboardView } from '@/shared/contracts/merchant-read'
import { StatusDonut } from './StatusDonut'
import { createDonutPlotConfig, donutPlotData } from './donut-presentation'
import { readMerchantPlotTheme } from './plot-theme'

vi.mock('./LazyPlotRenderers', () => ({ StatusPiePlotRenderer: () => <div data-plot="pie" /> }))
vi.mock('./plot-theme', async (importOriginal) => ({ ...await importOriginal<typeof import('./plot-theme')>(),
  useMerchantPlotTheme: () => ({ dark: false, colors: ['blue', 'green', 'orange', 'red'], text: 'black', secondary: 'gray', axis: 'gray', grid: 'gray', surface: 'white', border: 'gray', fontFamily: 'Inter' }),
}))

const money = (minorUnits: string) => ({
  minorUnits,
  currency: 'UZS' as const,
  scale: 2 as const,
})

function metric(count: number, minorUnits: string) {
  return {
    count,
    amount: money(minorUnits),
    countGrowthPct: null,
    amountGrowthPct: null,
  }
}

function viewWith(counts: readonly [number, number, number]): Pick<DashboardView, 'pie' | 'metrics'> {
  const [success, processing, failed] = counts
  const total = success + processing + failed
  const percent = (count: number) => total === 0 ? 0 : (count / total) * 100
  return {
    metrics: {
      total: metric(total, String(total * 10_000)),
      success: metric(success, String(success * 10_000)),
      processing: metric(processing, String(processing * 10_000)),
      failed: metric(failed, String(failed * 10_000)),
    },
    pie: {
      success: { count: success, amount: money(String(success * 10_000)), percent: percent(success) },
      processing: { count: processing, amount: money(String(processing * 10_000)), percent: percent(processing) },
      failed: { count: failed, amount: money(String(failed * 10_000)), percent: percent(failed) },
    },
  }
}

describe('StatusDonut', () => {
  it('maps raw category counts and exact tooltip fields to the Pie adapter', () => {
    const data = viewWith([1, 1, 2])
    const original = JSON.stringify(data)
    const theme = readMerchantPlotTheme({ fontFamily: 'Inter', getPropertyValue: (name) => name }, true)
    const config = createDonutPlotConfig(data, theme)
    expect(donutPlotData(data).map(({ key, value }) => [key, value])).toEqual([['success', 1], ['processing', 1], ['failed', 2]])
    expect(donutPlotData(data).map(({ exactAmount }) => exactAmount)).toEqual(['100.00 UZS', '100.00 UZS', '200.00 UZS'])
    expect(config).toMatchObject({ angleField: 'value', colorField: 'type', innerRadius: 0.64, legend: false, label: false, theme: 'classicDark', autoFit: true })
    expect(config.scale).toMatchObject({ color: { range: ['--status-success-indicator', '--status-warning-indicator', '--status-error-indicator'] } })
    expect(config.tooltip).toMatchObject({ items: [{ field: 'exactCount', name: 'Soni' }, { field: 'exactAmount', name: 'Summa' }] })
    expect(JSON.stringify(data)).toBe(original)
    expect(donutPlotData({ ...data, metrics: { ...data.metrics, total: metric(100, '1000000') } })).toEqual([])
    expect(donutPlotData(viewWith([0, 0, 0]))).toEqual([])
  })
  it('renders the authoritative status distribution as an accessible donut and legend', () => {
    const html = renderToStaticMarkup(<StatusDonut {...viewWith([1, 1, 2])} />)

    expect(html).toContain('data-plot="pie"')
    // The title icon is SVG; the distribution still uses the existing Pie adapter.
    expect(html.slice(html.indexOf('role="img"'))).not.toContain('<svg')
    expect(html).toContain('role="img"')
    expect(html).toContain('Muvaffaqiyatli: 25%')
    expect(html).toContain('Jarayonda: 25%')
    expect(html).toContain('Muvaffaqiyatsiz: 50%')
    expect(html).toContain('>1</span>')
    expect(html).toContain('>25%</span>')
    expect(html).toContain('>2</span>')
    expect(html).toContain('>50%</span>')
    expect(html).toContain('100.00 UZS')
    expect(html).toContain('200.00 UZS')
  })

  it('renders a neutral safe ring when every status is zero', () => {
    const html = renderToStaticMarkup(<StatusDonut {...viewWith([0, 0, 0])} />)

    expect(html).toContain('Status taqsimoti mavjud emas')
    expect(html).toContain('data-empty="true"')
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('Infinity')
    expect(html.match(/>0%<\/span>/g)).toHaveLength(3)
    expect(html).toMatch(/<dd\b[^>]*>—<\/dd>/)
    expect(html).toContain('Tanlangan davrda tranzaksiyalar mavjud emas.')
    expect(html).not.toMatch(/<dd\b[^>]*>0%<\/dd>/)
  })

  it.each([
    [[80, 10, 10], '80%'],
    [[1, 1, 1], '33,33%'],
    [[0, 1, 1], '0%'],
  ] as const)('shows a localized factual success share for counts %s', (counts, expected) => {
    const html = renderToStaticMarkup(<StatusDonut {...viewWith(counts)} />)
    expect(html).toContain('Muvaffaqiyat ulushi')
    expect(html).toMatch(new RegExp(`<dd\\b[^>]*>${expected}</dd>`))
    const shareTag = html.match(new RegExp(`<dd\\b[^>]*>${expected}</dd>`))?.[0] ?? ''
    expect(shareTag).toContain('text-text-primary')
    expect(shareTag).not.toContain('text-status-')
    expect(html).toContain('Jami tranzaksiyalar soniga nisbatan')
    expect(html).not.toMatch(/A’lo|Yaxshi|O‘rtacha|Yomon|Excellent|Good|Average|Poor/i)
  })

  it('uses summary total as denominator despite category and pie mismatch, retaining raw details and notes', () => {
    const base = viewWith([60, 20, 10])
    const data = { ...base, metrics: { ...base.metrics, total: metric(100, '1000000') } }
    const original = JSON.stringify(data)
    const html = renderToStaticMarkup(<StatusDonut {...data} />)
    expect(html).toMatch(/<dd\b[^>]*>60%<\/dd>/)
    expect(html).toContain('Ayrim holatlar ushbu taqsimotga kirmagan; foizlar ko‘rsatilmaydi.')
    expect(html).toContain('Kategoriyalar summasi jami summaga teng emas.')
    expect(html).toContain('data-empty="true"')
    expect(html).not.toContain('data-plot="pie"')
    expect(html).toMatch(/<p\b[^>]*text-text-primary[^>]*>100<\/p>/)
    const details = html.slice(html.indexOf('<dl', html.indexOf('data-empty')))
    expect(details).toContain('>60</span>')
    expect(details).toContain('>20</span>')
    expect(details).toContain('>10</span>')
    expect(details).not.toContain('%</span>')
    for (const amount of ['6 000.00 UZS', '2 000.00 UZS', '1 000.00 UZS']) expect(details).toContain(amount)
    expect(html).not.toMatch(/Boshqa|Unknown|Bekor qilingan|Rad etilgan/)
    expect(JSON.stringify(data)).toBe(original)
  })

  it('derives success share from summary rather than a different pie success count', () => {
    const base = viewWith([80, 10, 10])
    const data = { ...base, pie: { ...base.pie, success: { ...base.pie.success, count: 70, percent: 70 } } }
    const html = renderToStaticMarkup(<StatusDonut {...data} />)
    expect(html).toMatch(/<dd\b[^>]*>80%<\/dd>/)
    expect(html).toContain('Ayrim holatlar ushbu taqsimotga kirmagan; foizlar ko‘rsatilmaydi.')
    expect(html).not.toContain('data-plot="pie"')
  })

  it('preserves status swatches, neutral center and details, and amount-only mismatch notes', () => {
    const base = viewWith([1, 1, 2])
    const data = { ...base, metrics: { ...base.metrics, total: metric(4, '40001') } }
    const html = renderToStaticMarkup(<StatusDonut {...data} />)
    expect(html).toMatch(/<p\b[^>]*text-text-primary[^>]*>4<\/p>/)
    for (const tone of ['success', 'warning', 'error']) {
      expect(html).toContain(`bg-status-${tone}-indicator`)
    }
    expect(html).toContain('>1</span>')
    expect(html).toContain('>25%</span>')
    expect(html).toContain('>2</span>')
    expect(html).toContain('>50%</span>')
    expect(html).toContain('100.00 UZS')
    expect(html).toContain('200.00 UZS')
    expect(html).toContain('Kategoriyalar summasi jami summaga teng emas.')
    expect(html).not.toContain('Ayrim holatlar ushbu taqsimotga kirmagan')
    expect(html).toContain('data-plot="pie"')
  })

  it('keeps a long authoritative total in a wrapping neutral center without changing reconciliation', () => {
    const base = viewWith([1, 1, 2])
    const total = Number.MAX_SAFE_INTEGER
    const data = { ...base, metrics: { ...base.metrics, total: metric(total, '900719925474099301') } }
    const html = renderToStaticMarkup(<StatusDonut {...data} />)
    const centers = [...html.matchAll(/<p\b[^>]*data-slot="donut-center-total"[^>]*>([^<]*)<\/p>/g)]
    expect(centers).toHaveLength(1)
    expect(centers[0]?.[1]).toBe(total.toLocaleString('uz-UZ'))
    const center = centers[0]?.[0]
    expect(center).toBeDefined()
    expect(center).toContain('[overflow-wrap:anywhere]')
    expect(center).toContain('text-text-primary')
    expect(center).not.toContain('text-status-')
    expect(html).not.toContain('<text')
    expect(html).toContain('data-empty="true"')
    expect(html).toContain('Ayrim holatlar ushbu taqsimotga kirmagan; foizlar ko‘rsatilmaydi.')
    expect(html).toContain('Kategoriyalar summasi jami summaga teng emas.')
    expect(html).not.toMatch(/NaN|Infinity/)
  })
})
