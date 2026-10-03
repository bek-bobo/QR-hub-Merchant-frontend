import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardView } from '@/shared/contracts/merchant-read'
import { TrendChart } from './TrendChart'

const harness = vi.hoisted(() => ({ mode: null as 'amount' | 'count' | null, query: vi.fn() }))
// Exercise local mode callbacks with the repository's existing hook-harness pattern.
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => [harness.mode ?? initial, (next: 'amount' | 'count') => { harness.mode = next }],
}))
vi.mock('@tanstack/react-query', () => ({ useQuery: harness.query, useQueryClient: harness.query }))

function view(values: readonly (readonly [number, string])[]): DashboardView {
  const zero = { count: 0, amount: { minorUnits: '0', currency: 'UZS' as const, scale: 2 as const } }
  const metric = { ...zero, countGrowthPct: null, amountGrowthPct: null }
  const segment = { ...zero, percent: 0 }
  return {
    chartGroupBy: 'DAY',
    metrics: { total: metric, success: metric, failed: metric, processing: metric },
    pie: { success: segment, failed: segment, processing: segment },
    buckets: values.map(([count, minorUnits], index) => ({
      label: `Bucket ${index}`, periodStart: '2026-10-01', periodEnd: '2026-10-01',
      values: { total: { count, amount: { ...zero.amount, minorUnits } }, success: zero, failed: zero, processing: zero },
    })),
  }
}

beforeEach(() => { harness.mode = null; vi.clearAllMocks() })

describe('TrendChart presentation', () => {
  it('defaults to amount and switches both ways without query interaction or data mutation', () => {
    const data = view([[9, '100'], [1, '900719925474099301']])
    const original = JSON.stringify(data)
    const amountHtml = renderToStaticMarkup(<TrendChart view={data} />)
    expect(amountHtml).toMatch(/<button\b[^>]*aria-pressed="true"[^>]*>Summa<\/button>/)
    expect(amountHtml).toMatch(/<button\b[^>]*aria-pressed="false"[^>]*>Soni<\/button>/)
    const chart = TrendChart({ view: data })
    const controls = chart.props.children[0].props.children[1].props.children
    controls[1].props.onClick()
    const countHtml = renderToStaticMarkup(<TrendChart view={data} />)
    expect(countHtml).toMatch(/<button\b[^>]*aria-pressed="true"[^>]*>Soni<\/button>/)
    expect(countHtml).toContain('Soni dinamikasi')
    expect(countHtml).toContain('role="group" aria-label="Trend ko‘rinishi"')
    expect(countHtml.match(/<polyline\b[^>]*>/)?.[0]).not.toBe(amountHtml.match(/<polyline\b[^>]*>/)?.[0])
    const table = (html: string) => html.slice(html.indexOf('<table'), html.indexOf('</table>') + 8)
    expect(table(countHtml)).toBe(table(amountHtml))
    expect(countHtml).toContain('9 007 199 254 740 993.01 UZS')
    expect(countHtml).toContain('Soni: ')
    expect(countHtml).toContain('Summa: ')
    controls[0].props.onClick()
    expect(renderToStaticMarkup(<TrendChart view={data} />)).toContain('Summa dinamikasi')
    expect(harness.query).not.toHaveBeenCalled()
    expect(JSON.stringify(data)).toBe(original)
  })

  it.each(['amount', 'count'] as const)('%s retains axes, exact data and safe zero/single/empty output', (mode) => {
    harness.mode = mode
    for (const values of [[], [[0, '0']], [[1, '100']]] as const) {
      const html = renderToStaticMarkup(<TrendChart view={view(values)} />)
      expect(html).toContain('Trendning aniq qiymatlari')
      expect(html).not.toMatch(/NaN|Infinity/)
      if (values.length === 0) {
        expect(html).toContain('Tanlangan davr uchun trend nuqtalari mavjud emas.')
        expect(html).not.toContain('<svg')
      } else {
        expect(html).toContain('aria-hidden="true"')
        expect(html.match(/<line\b/g)).toHaveLength(5)
        expect(html.match(/<circle\b/g)).toHaveLength(4)
        expect(html).not.toContain('<polyline')
        expect(html).toContain('Bucket 0')
        expect(html).toContain('stroke-chart-grid')
        expect(html).toContain('fill-text-secondary')
      }
    }
  })

  it('renders ordered neutral legend labels with semantic swatches and four line/marker roles', () => {
    const html = renderToStaticMarkup(<TrendChart view={view([[3, '900'], [7, '1200']])} />)
    const legend = html.slice(html.indexOf('<ul'), html.indexOf('</ul>'))
    const labels = [...legend.matchAll(/<span>([^<]*)<\/span>/g)].map((match) => match[1])
    expect(labels).toEqual(['Jami', 'Muvaffaqiyatli', 'Jarayonda', 'Muvaffaqiyatsiz'])
    expect(legend.match(/<li\b/g)).toHaveLength(4)
    expect(html.match(/<polyline\b/g)).toHaveLength(4)
    expect(html.match(/<circle\b/g)).toHaveLength(8)
    for (const role of ['chart-series-primary', 'status-success-indicator', 'status-warning-indicator', 'status-error-indicator']) {
      expect(legend).toContain(`bg-${role}`)
      expect(html).toContain(`stroke-${role}`)
      expect(html).toContain(`fill-${role}`)
    }
    expect(legend).not.toMatch(/text-status-|bg-status-.*background/)
    expect(html).not.toMatch(/Other|Bekor qilingan|Status 20/)
  })

  it('keeps count and exact amount for every category in the table and native marker titles', () => {
    const base = view([[10, '10000']])
    const bucket = base.buckets[0]!
    const data: DashboardView = { ...base, buckets: [{ ...bucket, values: { ...bucket.values,
      success: { count: 3, amount: { ...bucket.values.total.amount, minorUnits: '12345' } },
      processing: { count: 2, amount: { ...bucket.values.total.amount, minorUnits: '6789' } },
      failed: { count: 1, amount: { ...bucket.values.total.amount, minorUnits: '4567' } },
    } }] }
    const renderTable = (mode: 'amount' | 'count') => {
      harness.mode = mode
      const html = renderToStaticMarkup(<TrendChart view={data} />)
      expect(html).toContain(`Bucket 0 · Muvaffaqiyatli: ${mode === 'amount' ? '123.45 UZS' : '3'}`)
      return html.slice(html.indexOf('<table'), html.indexOf('</table>'))
    }
    const table = renderTable('amount')
    expect(renderTable('count')).toBe(table)
    for (const label of ['Davr', 'Jami', 'Muvaffaqiyatli', 'Jarayonda', 'Muvaffaqiyatsiz']) expect(table).toContain(`>${label}</th>`)
    for (const amount of ['100.00', '123.45', '67.89', '45.67']) expect(table).toContain(`${amount} UZS`)
    for (const count of [10, 3, 2, 1]) expect(table).toContain(`Soni: </span>${count}</p>`)
    expect(table.match(/Soni: /g)).toHaveLength(4)
    expect(table.match(/Summa: /g)).toHaveLength(4)
    expect(table).not.toContain('text-status-')
  })
})
