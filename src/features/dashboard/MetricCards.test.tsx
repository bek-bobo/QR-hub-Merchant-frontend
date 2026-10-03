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
  it('preserves four neutral amounts/counts and existing icon semantics, with both growth measures', () => {
    const metrics: DashboardView['metrics'] = {
      total: metric(7, '900719925474099301', 1, -2),
      success: metric(3, '12345', 12.5, -6.25),
      processing: metric(2, '5678', null, 0),
      failed: metric(2, '9012', 8, -4),
    }
    const html = renderToStaticMarkup(<MetricCards metrics={metrics} />)
    const cards = html.split('data-slot="card"').slice(1)
    expect(cards).toHaveLength(4)
    expect(html).not.toMatch(/<a\b|<button\b/)

    const expected = [
      ['Jami', '9 007 199 254 740 993.01 UZS', '7', 'bg-brand-soft text-brand', '+1%', '-2%'],
      ['Muvaffaqiyatli', '123.45 UZS', '3', 'bg-status-success-background text-status-success-foreground', '+12,5%', '-6,25%'],
      ['Jarayonda', '56.78 UZS', '2', 'bg-status-warning-background text-status-warning-foreground', '—', '0%'],
      ['Muvaffaqiyatsiz', '90.12 UZS', '2', 'bg-status-error-background text-status-error-foreground', '+8%', '-4%'],
    ]
    expected.forEach(([label, amount, count, chip, countGrowth, amountGrowth], index) => {
      const card = cards[index] ?? ''
      expect(card).toContain(`>${label}</div>`)
      expect(card).toContain(chip)
      const amountTag = card.match(/<p\b[^>]*>/)?.[0] ?? ''
      expect(amountTag).toContain('text-text-primary')
      expect(amountTag).not.toContain('text-status-')
      expect(card).toContain(`>${amount}</p>`)
      expect(card).toContain(`>${count} ta tranzaksiya</p>`)
      const countTag = card.match(/<p\b[^>]*>[^<]* ta tranzaksiya<\/p>/)?.[0] ?? ''
      expect(countTag).toContain('text-text-secondary')
      expect(countTag).not.toContain('text-status-')
      const measures = [...card.matchAll(/<dt\b[^>]*>([^<]*)<\/dt>[\s\S]*?<dd\b[^>]*>([\s\S]*?)<\/dd>/g)]
      expect(measures).toHaveLength(2)
      expect(measures[0]?.[1]).toBe('Soni o‘zgarishi')
      expect(measures[0]?.[2]).toContain(`>${countGrowth}</span>`)
      expect(measures[1]?.[1]).toBe('Summa o‘zgarishi')
      expect(measures[1]?.[2]).toContain(`>${amountGrowth}</span>`)
      expect(card).toContain('Oldingi davrga nisbatan')
    })
    // Both failed measures apply inverse desirability independently.
    const failedDeltas = [...(cards[3] ?? '').matchAll(/<dd\b[^>]*>/g)].map((match) => match[0])
    expect(failedDeltas[0]).toContain('text-status-error-foreground')
    expect(failedDeltas[1]).toContain('text-status-success-foreground')
  })

  it('keeps zero money/count distinct from unavailable comparisons', () => {
    const empty = metric(0, '0', null, null)
    const html = renderToStaticMarkup(<MetricCards metrics={{ total: empty, success: empty, processing: empty, failed: empty }} />)
    expect(html.match(/>0\.00 UZS<\/p>/g)).toHaveLength(4)
    expect(html.match(/>0 ta tranzaksiya<\/p>/g)).toHaveLength(4)
    expect(html.match(/>—<\/span>/g)).toHaveLength(8)
    expect(html).not.toContain('>0%</span>')
  })
})
