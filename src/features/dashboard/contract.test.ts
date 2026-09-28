import { describe, expect, it } from 'vitest'
import { decodeDashboardResponse } from './contract'

const summary = {
  totalCount: 1,
  successCount: 1,
  failedCount: 0,
  processingCount: 0,
  totalAmount: 100000,
  successAmount: 100000,
  failedAmount: 0,
  processingAmount: 0,
  totalCountGrowth: null,
  successCountGrowth: 25,
  failedCountGrowth: null,
  processingCountGrowth: null,
  totalAmountGrowth: null,
  successAmountGrowth: 12.5,
  failedAmountGrowth: null,
  processingAmountGrowth: null,
}

describe('dashboard read contract', () => {
  it('decodes exact UZS minor units and nullable growth', () => {
    const decoded = decodeDashboardResponse({
      success: true,
      data: {
        summary,
        pieStats: {
          success: { count: 1, amount: 100000, percent: 100 },
          failed: { count: 0, amount: 0, percent: 0 },
          processing: { count: 0, amount: 0, percent: 0 },
        },
        chartGroupBy: 'DAY',
        chartStats: [
          {
            label: '15.09',
            periodStart: '2026-09-15',
            periodEnd: '2026-09-15',
            totalCount: 1,
            successCount: 1,
            failedCount: 0,
            processingCount: 0,
            totalAmount: 100000,
            successAmount: 100000,
            failedAmount: 0,
            processingAmount: 0,
          },
        ],
      },
    })

    expect(decoded.metrics.total.amount).toEqual({
      minorUnits: '100000',
      currency: 'UZS',
      scale: 2,
    })
    expect(decoded.metrics.total.countGrowthPct).toBeNull()
    expect(decoded.metrics.success.amountGrowthPct).toBe(12.5)
    expect(decoded.buckets[0]?.periodStart).toBe('2026-09-15')
  })

  it('rejects a malformed envelope and unsafe Long amount', () => {
    expect(() => decodeDashboardResponse({ data: {} })).toThrow()
    expect(() =>
      decodeDashboardResponse({
        success: true,
        data: {
          summary: { ...summary, totalAmount: 9007199254740992 },
          pieStats: {
            success: { count: 1, amount: 100000, percent: 100 },
            failed: { count: 0, amount: 0, percent: 0 },
            processing: { count: 0, amount: 0, percent: 0 },
          },
          chartGroupBy: 'DAY',
          chartStats: [],
        },
      }),
    ).toThrow()
  })
})
