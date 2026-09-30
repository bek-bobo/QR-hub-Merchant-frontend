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
  })
})
