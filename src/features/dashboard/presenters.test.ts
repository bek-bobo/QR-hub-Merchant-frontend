import { describe, expect, it } from 'vitest'
import type { DashboardBucket } from '@/shared/contracts/merchant-read'
import {
  applyDashboardFilters,
  formatGrowth,
  presentQrStatus,
  projectAmountTrend,
  reconcileDashboard,
  resetDashboardFilters,
} from './presenters'

const money = (minorUnits: string) => ({
  minorUnits,
  currency: 'UZS' as const,
  scale: 2 as const,
})

function bucket(
  label: string,
  periodStart: string,
  totalAmount: string,
): DashboardBucket {
  const countAmount = { count: 1, amount: money(totalAmount) }
  return {
    label,
    periodStart,
    periodEnd: periodStart,
    values: {
      total: countAmount,
      success: countAmount,
      processing: { count: 0, amount: money('0') },
      failed: { count: 0, amount: money('0') },
    },
  }
}

describe('dashboard presenters', () => {
  it('keeps draft validation separate and reset applies the default range', () => {
    expect(() =>
      applyDashboardFilters({
        fromDate: '2026-09-15',
        toDate: '2026-09-14',
      }),
    ).toThrow()
    expect(
      applyDashboardFilters({
        fromDate: '2026-09-09',
        toDate: '2026-09-15',
        terminalId: '  terminal-a  ',
      }),
    ).toEqual({
      fromDate: '2026-09-09',
      toDate: '2026-09-15',
      terminalId: 'terminal-a',
    })
    expect(resetDashboardFilters(new Date('2026-09-14T20:30:00Z'))).toEqual({
      fromDate: '2026-09-09',
      toDate: '2026-09-15',
    })
  })

  it('renders null growth as unavailable instead of zero', () => {
    expect(formatGrowth(null)).toBe('—')
    expect(formatGrowth(0)).toBe('0%')
  })

  it.each([
    [0, 'Yangi', 'info'],
    [5, 'Muddati o‘tgan', 'error'],
    [10, 'Jarayonda', 'warning'],
    [20, 'Bekor qilingan', 'error'],
    [25, 'Rad etilgan', 'error'],
    [50, 'Muvaffaqiyatli', 'success'],
    [777, 'Noma’lum (777)', 'neutral'],
  ] as const)('maps raw status %s to its existing label and semantic tone', (statusCode, label, tone) => {
    expect(presentQrStatus(statusCode)).toEqual({ label, tone })
  })

  it('projects only backend buckets and retains exact money', () => {
    const buckets = [
      bucket('09.09', '2026-09-09', '100'),
      bucket('11.09', '2026-09-11', '900719925474099300'),
    ]
    const view = { buckets }
    const points = projectAmountTrend(view, 'UNKNOWN', 600, 180)

    expect(points).toHaveLength(2)
    expect(points.map((point) => point.period)).toEqual([
      '2026-09-09',
      '2026-09-11',
    ])
    expect(points[1]?.amount.minorUnits).toBe('900719925474099300')
    expect(Number.isFinite(points[1]!.y)).toBe(true)
  })

  it('hides category percentages when counts do not cover total and checks money separately', () => {
    const metric = (count: number, amount: string) => ({
      count, amount: money(amount), countGrowthPct: null, amountGrowthPct: null,
    })
    const metrics = {
      total: metric(10, '1000'), success: metric(4, '400'),
      processing: metric(1, '100'), failed: metric(2, '200'),
    }
    expect(reconcileDashboard({ metrics })).toEqual({ countMatches: false, amountMatches: false })
    expect(reconcileDashboard({ metrics: { ...metrics, total: metric(7, '700') } }))
      .toEqual({ countMatches: true, amountMatches: true })
    expect(reconcileDashboard({ metrics: { ...metrics, total: metric(7, '701') } }))
      .toEqual({ countMatches: true, amountMatches: false })
    expect(reconcileDashboard({ metrics: {
      total: metric(0, '0'), success: metric(0, '0'),
      processing: metric(0, '0'), failed: metric(0, '0'),
    } })).toEqual({ countMatches: true, amountMatches: true })
  })
})
