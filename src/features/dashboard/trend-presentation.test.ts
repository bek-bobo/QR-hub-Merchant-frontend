import { describe, expect, it } from 'vitest'
import type { DashboardBucket } from '@/shared/contracts/merchant-read'
import { projectTrend } from './trend-presentation'

function trendBucket(label: string, count: number, minorUnits: string): DashboardBucket {
  const total = { count, amount: { minorUnits, currency: 'UZS' as const, scale: 2 as const } }
  const other = { count: 0, amount: { ...total.amount, minorUnits: '0' } }
  return { label, periodStart: '2026-10-01', periodEnd: '2026-10-01',
    values: { total, success: other, processing: other, failed: other } }
}

describe('total trend projection', () => {
  it('uses total amount and total count independently without changing buckets', () => {
    const buckets = [trendBucket('A', 9, '100'), trendBucket('B', 1, '900719925474099301')]
    const original = JSON.stringify(buckets)
    const amount = projectTrend({ buckets }, 'amount')
    const count = projectTrend({ buckets }, 'count')
    expect(amount.points[0]!.y).toBeGreaterThan(amount.points[1]!.y)
    expect(count.points[0]!.y).toBeLessThan(count.points[1]!.y)
    expect(amount.points[1]!.amount.minorUnits).toBe('900719925474099301')
    expect(amount.points.map(({ x }) => x)).toEqual(count.points.map(({ x }) => x))
    expect([amount.width, amount.height]).toEqual([count.width, count.height])
    expect(amount.points.map(({ period }) => period)).toEqual(['A', 'B'])
    expect(JSON.stringify(buckets)).toBe(original)
  })

  it.each(['amount', 'count'] as const)('%s scale is finite, monotonic and zero/single-point safe', (mode) => {
    for (const buckets of [[], [trendBucket('Zero', 0, '0')],
      [trendBucket('A', 0, '0'), trendBucket('B', 0, '0')],
      [trendBucket('One', 1, '1')]]) {
      const chart = projectTrend({ buckets }, mode)
      expect(chart.ticks).toHaveLength(5)
      expect(chart.ticks[0]!.value).toBe(0n)
      expect(chart.ticks[0]!.y).toBe(chart.bottom)
      expect(chart.points).toHaveLength(buckets.length)
      for (const point of chart.points) {
        expect(Number.isFinite(point.x)).toBe(true)
        expect(Number.isFinite(point.y)).toBe(true)
        expect(point.x).toBeGreaterThanOrEqual(chart.left)
        expect(point.x).toBeLessThanOrEqual(chart.width - chart.right)
      }
      expect(chart.series).toHaveLength(4)
      for (const item of chart.series) {
        expect(item.points).toHaveLength(buckets.length)
        expect(item.points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true)
      }
      chart.ticks.slice(1).forEach((tick, index) => {
        expect(tick.value).toBeGreaterThan(chart.ticks[index]!.value)
        expect(tick.y).toBeLessThan(chart.ticks[index]!.y)
      })
    }
  })

  it('formats exact money ticks and integral count ticks, including large values', () => {
    const amount = projectTrend({ buckets: [trendBucket('A', Number.MAX_SAFE_INTEGER, '900719925474099301')] }, 'amount')
    expect(amount.ticks[0]!.label).toBe('0.00 UZS')
    expect(amount.ticks[4]!.label).toBe('9 007 199 254 740 993.04 UZS')
    const count = projectTrend({ buckets: [trendBucket('A', Number.MAX_SAFE_INTEGER, '0')] }, 'count')
    for (const tick of count.ticks) {
      expect(tick.label).toMatch(/^[\d\s\u00a0\u202f]+$/)
      expect(Number.isFinite(tick.y)).toBe(true)
    }
  })

  it('selects sparse backend labels deterministically including first and last', () => {
    const buckets = Array.from({ length: 20 }, (_, index) => trendBucket(`Backend ${index}`, index, String(index)))
    const chart = projectTrend({ buckets }, 'amount')
    expect(chart.xLabels.map(({ index }) => index)).toEqual([0, 5, 10, 14, 19])
    expect(chart.xLabels.map(({ period }) => period)).toEqual(['Backend 0', 'Backend 5', 'Backend 10', 'Backend 14', 'Backend 19'])
    expect(chart.points).toHaveLength(20)
  })

  it('uses all four raw series with a shared scale, without reconciling categories to total', () => {
    const base = trendBucket('Mismatch', 10, '1000')
    const bucket = { ...base, values: { ...base.values,
      success: { count: 20, amount: { ...base.values.total.amount, minorUnits: '2000' } },
      processing: { count: 4, amount: { ...base.values.total.amount, minorUnits: '400' } },
      failed: { count: 2, amount: { ...base.values.total.amount, minorUnits: '200' } },
    } }
    const original = JSON.stringify(bucket)
    for (const mode of ['amount', 'count'] as const) {
      const chart = projectTrend({ buckets: [bucket] }, mode)
      expect(chart.series.map(({ key }) => key)).toEqual(['total', 'success', 'processing', 'failed'])
      expect(chart.series.map(({ points }) => points[0]!.value)).toEqual(mode === 'amount'
        ? [1000n, 2000n, 400n, 200n] : [10n, 20n, 4n, 2n])
      expect(chart.ticks[4]!.value).toBe(mode === 'amount' ? 2000n : 20n)
      expect(chart.series.map(({ points }) => points[0]!.y)).toEqual([100, 20, 148, 164])
      expect(new Set(chart.series.map(({ points }) => points[0]!.x)).size).toBe(1)
    }
    expect(JSON.stringify(bucket)).toBe(original)
  })

  it('keeps large status amounts exact while projecting against the same ceiling', () => {
    const base = trendBucket('Large', 1, '100')
    const bucket = { ...base, values: { ...base.values,
      failed: { count: 2, amount: { ...base.values.total.amount, minorUnits: '900719925474099301' } },
    } }
    const chart = projectTrend({ buckets: [bucket] }, 'amount')
    expect(chart.series[3]!.points[0]!.amount.minorUnits).toBe('900719925474099301')
    expect(chart.ticks[4]!.value).toBe(900719925474099304n)
    expect(chart.series.every(({ points }) => Number.isFinite(points[0]!.y))).toBe(true)
    expect(chart.series[0]!.points[0]!.y).toBeGreaterThan(chart.series[3]!.points[0]!.y)
  })

  it('switches every series together across multiple buckets with identical horizontal positions', () => {
    const buckets = [0, 1].map((index) => {
      const base = trendBucket(`Bucket ${index}`, index + 10, String(1000 - index * 100))
      return { ...base, values: { ...base.values,
        success: { count: index + 5, amount: { ...base.values.total.amount, minorUnits: String(500 - index * 100) } },
        processing: { count: index + 3, amount: { ...base.values.total.amount, minorUnits: String(300 - index * 100) } },
        failed: { count: index + 1, amount: { ...base.values.total.amount, minorUnits: String(100 - index * 100) } },
      } }
    })
    const amount = projectTrend({ buckets }, 'amount')
    const count = projectTrend({ buckets }, 'count')
    expect(amount.series.map(({ points }) => points.map(({ value }) => value)))
      .toEqual([[1000n, 900n], [500n, 400n], [300n, 200n], [100n, 0n]])
    expect(count.series.map(({ points }) => points.map(({ value }) => value)))
      .toEqual([[10n, 11n], [5n, 6n], [3n, 4n], [1n, 2n]])
    for (let index = 0; index < 4; index++) {
      const moneyPoints = amount.series[index]!.points
      const countPoints = count.series[index]!.points
      expect(moneyPoints[0]!.y).toBeLessThan(moneyPoints[1]!.y)
      expect(countPoints[0]!.y).toBeGreaterThan(countPoints[1]!.y)
      expect(moneyPoints.map(({ x }) => x)).toEqual(amount.points.map(({ x }) => x))
      expect(countPoints.map(({ x }) => x)).toEqual(moneyPoints.map(({ x }) => x))
    }
  })
})
