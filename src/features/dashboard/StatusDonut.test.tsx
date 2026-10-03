import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DashboardView } from '@/shared/contracts/merchant-read'
import { StatusDonut } from './StatusDonut'

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
  it('renders the authoritative status distribution as an accessible donut and legend', () => {
    const html = renderToStaticMarkup(<StatusDonut {...viewWith([1, 1, 2])} />)

    expect(html).toContain('<svg')
    expect(html).toContain('role="img"')
    expect(html).toContain('Muvaffaqiyatli: 25%')
    expect(html).toContain('Jarayonda: 25%')
    expect(html).toContain('Muvaffaqiyatsiz: 50%')
    expect(html).toContain('1 · 25%')
    expect(html).toContain('2 · 50%')
    expect(html).toContain('100.00 UZS')
    expect(html).toContain('200.00 UZS')
  })

  it('renders a neutral safe ring when every status is zero', () => {
    const html = renderToStaticMarkup(<StatusDonut {...viewWith([0, 0, 0])} />)

    expect(html).toContain('Status taqsimoti mavjud emas')
    expect(html).toContain('data-empty="true"')
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('Infinity')
    expect(html.match(/0 · 0%/g)).toHaveLength(3)
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
    const shareTag = html.match(/<dd\b[^>]*>/)?.[0] ?? ''
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
    expect(html.match(/<circle\b/g)).toHaveLength(1)
    expect(html).not.toContain('strokeDasharray')
    expect(html).not.toContain('stroke-dasharray')
    expect(html).toMatch(/<text\b[^>]*>100<\/text>/)
    const details = html.slice(html.indexOf('<dl', html.indexOf('<svg')))
    expect(details).toContain('>60</p>')
    expect(details).toContain('>20</p>')
    expect(details).toContain('>10</p>')
    expect(details).not.toContain('%</p>')
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
    expect(html.match(/<circle\b/g)).toHaveLength(1)
  })

  it('preserves category arc/swatch roles, neutral center and details, and amount-only mismatch notes', () => {
    const base = viewWith([1, 1, 2])
    const data = { ...base, metrics: { ...base.metrics, total: metric(4, '40001') } }
    const html = renderToStaticMarkup(<StatusDonut {...data} />)
    expect(html).toMatch(/<text\b[^>]*fill-text-primary[^>]*>4<\/text>/)
    for (const tone of ['success', 'warning', 'error']) {
      expect(html).toContain(`stroke-status-${tone}-indicator`)
      expect(html).toContain(`bg-status-${tone}-indicator`)
    }
    expect(html).not.toContain('text-status-')
    expect(html).toContain('1 · 25%')
    expect(html).toContain('2 · 50%')
    expect(html).toContain('100.00 UZS')
    expect(html).toContain('200.00 UZS')
    expect(html).toContain('Kategoriyalar summasi jami summaga teng emas.')
    expect(html).not.toContain('Ayrim holatlar ushbu taqsimotga kirmagan')
    expect(html.match(/<circle\b/g)).toHaveLength(4)
  })
})
