import { describe, expect, it } from 'vitest'
import {
  applyDashboardFilters,
  formatGrowth,
  presentQrStatus,
  reconcileDashboard,
  resetDashboardFilters,
} from './presenters'

const money = (minorUnits: string) => ({
  minorUnits,
  currency: 'UZS' as const,
  scale: 2 as const,
})

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
    [777, 'Noma’lum', 'neutral'],
  ] as const)('maps raw status %s to its existing label and semantic tone', (statusCode, label, tone) => {
    expect(presentQrStatus(statusCode)).toEqual({ label, tone })
  })

  it('keeps an unknown raw status intact without exposing it in the label', () => {
    const statusCode = 777
    const presentation = presentQrStatus(statusCode)

    expect(presentation).toEqual({ label: 'Noma’lum', tone: 'neutral' })
    expect(presentation.label).not.toContain('777')
    expect(statusCode).toBe(777)
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
