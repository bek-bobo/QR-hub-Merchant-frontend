import { dashboardZero } from './test-fixtures'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DashboardView, Metric, Outcome } from '@/shared/contracts/merchant-read'
import { MetricCards } from './MetricCards'
import { MetricGrowthIndicator } from './MetricGrowthIndicator'

function renderGrowth(outcome: Outcome, value: number | null) {
  return renderToStaticMarkup(
    <dl><MetricGrowthIndicator label="Soni o‘zgarishi" outcome={outcome} value={value} /></dl>,
  )
}

describe('metric growth presentation', () => {
  it.each([
    ['success', 12.5, '+12,5%', 'O‘sish, ijobiy o‘zgarish', 'text-status-success-foreground'],
    ['success', -12.5, '-12,5%', 'Kamayish, salbiy o‘zgarish', 'text-status-error-foreground'],
    ['failed', 12.5, '+12,5%', 'O‘sish, salbiy o‘zgarish', 'text-status-error-foreground'],
    ['failed', -12.5, '-12,5%', 'Kamayish, ijobiy o‘zgarish', 'text-status-success-foreground'],
    ['total', 12.5, '+12,5%', 'O‘sish', 'text-text-primary'],
    ['total', -12.5, '-12,5%', 'Kamayish', 'text-text-primary'],
    ['processing', 12.5, '+12,5%', 'O‘sish', 'text-text-primary'],
    ['processing', -12.5, '-12,5%', 'Kamayish', 'text-text-primary'],
  ] as const)('%s growth %s keeps direction separate from desirability', (outcome, value, formatted, description, color) => {
    const html = renderGrowth(outcome, value)
    const deltaTag = html.match(/<dd\b[^>]*>/)?.[0]
    expect(deltaTag).toContain(color)
    expect(html).toContain(`>${formatted}</span>`)
    expect(html).toContain(`${description}: `)
    expect(html.match(/<svg\b/g)).toHaveLength(1)
    expect(html).toContain('aria-hidden="true"')
    if (outcome === 'total' || outcome === 'processing') {
      expect(html).not.toMatch(/ijobiy|salbiy|text-status-success|text-status-error/)
    }
  })

  it.each(['total', 'success', 'processing', 'failed'] as const)('%s zero and unavailable growth stay neutral without arrows', (outcome) => {
    const zero = renderGrowth(outcome, 0)
    const unavailable = renderGrowth(outcome, null)
    expect(zero).toContain('>0%</span>')
    expect(zero).toContain('O‘zgarish yo‘q')
    expect(unavailable).toContain('>—</span>')
    expect(unavailable).toContain('Taqqoslash mavjud emas')
    for (const html of [zero, unavailable]) {
      expect(html.match(/<dd\b[^>]*>/)?.[0]).toContain('text-text-primary')
      expect(html).not.toMatch(/<svg\b|text-status-success|text-status-error/)
    }
  })
})

function metric(count: number, minorUnits: string, countGrowthPct: number | null, amountGrowthPct: number | null): Metric {
  return {
    count,
    amount: { minorUnits, currency: 'UZS', scale: 2 },
    countGrowthPct,
    amountGrowthPct,
  }
}

describe('Dashboard metric cards', () => {
  it('shows four count-first cards without obsolete amount/comparison disclosures', () => {
    const metrics: DashboardView['metrics'] = { uncategorized: dashboardZero,
      total: metric(7, '900719925474099301', 1, -2),
      success: metric(3, '12345', 12.5, -6.25),
      processing: metric(2, '5678', null, 0),
      failed: metric(2, '9012', 8, -4),
    }
    const original = JSON.stringify(metrics)
    const html = renderToStaticMarkup(<MetricCards metrics={metrics} />)
    const cards = html.split('data-slot="card"').slice(1)
    expect(cards).toHaveLength(4)
    expect(html).not.toMatch(/<a\b|<button\b|<details\b|<summary\b/)
    expect(html).not.toMatch(/Summa va taqqoslash|Soni o‘zgarishi|Summa o‘zgarishi|UZS/)
    const expected = [
      ['Jami', '7', 'bg-brand-soft text-brand', 'Barcha tranzaksiyalar'],
      ['Muvaffaqiyatli', '3', 'bg-status-success-background text-status-success-foreground', 'Muvaffaqiyatli tranzaksiyalar'],
      ['Jarayonda', '2', 'bg-status-warning-background text-status-warning-foreground', 'Jarayondagi tranzaksiyalar'],
      ['Muvaffaqiyatsiz', '2', 'bg-status-error-background text-status-error-foreground', 'Muvaffaqiyatsiz tranzaksiyalar'],
    ]
    expected.forEach(([label, count, chip, description], index) => {
      const card = cards[index] ?? ''
      expect(card).toContain(`>${label}</div>`)
      expect(card).toContain(chip)
      expect(card).toContain(`>${count}</p>`)
      expect(card).toContain(description)
      expect(card.match(/<p\b[^>]*>/)?.[0]).toContain('text-text-primary')
    })
    // Removing the disclosure does not modify exact amounts or growth data.
    expect(JSON.stringify(metrics)).toBe(original)
  })

  it('keeps zero counts valid without undefined percentages', () => {
    const empty = metric(0, '0', null, null)
    const segment = { ...empty, percent: 0 }
    const html = renderToStaticMarkup(<MetricCards
      metrics={{ uncategorized: dashboardZero, total: empty, success: empty, processing: empty, failed: empty }}
      pie={{ uncategorized: dashboardZero, success: segment, processing: segment, failed: segment }} />)
    expect(html.match(/>0<\/p>/g)).toHaveLength(4)
    expect(html).not.toMatch(/NaN|Infinity|ulushi|<details/)
  })

  it('uses reconciled pie percentages for count badges and suppresses mismatched shares', () => {
    const metrics = { uncategorized: dashboardZero, total: metric(4, '400', null, null), success: metric(2, '200', null, null),
      processing: metric(1, '100', null, null), failed: metric(1, '100', null, null) }
    const pie: DashboardView['pie'] = { uncategorized: dashboardZero,
      success: { count: 2, amount: metrics.success.amount, percent: 50 },
      processing: { count: 1, amount: metrics.processing.amount, percent: 25 },
      failed: { count: 1, amount: metrics.failed.amount, percent: 25 },
    }
    const html = renderToStaticMarkup(<MetricCards metrics={metrics} pie={pie} />)
    expect(html).toContain('aria-label="Muvaffaqiyatli ulushi"')
    expect(html).toContain('>50%</span>')
    expect(html.match(/>25%<\/span>/g)).toHaveLength(2)
    expect(html).toContain('Barcha tranzaksiyalar')
    expect(html).not.toContain('<details')
    const mismatched = renderToStaticMarkup(<MetricCards metrics={{ ...metrics, total: metric(5, '500', null, null) }} pie={pie} />)
    expect(mismatched).not.toContain('aria-label="Muvaffaqiyatli ulushi"')
  })
})
