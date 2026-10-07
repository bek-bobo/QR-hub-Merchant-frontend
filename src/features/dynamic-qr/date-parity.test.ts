import { describe, expect, it } from 'vitest'
import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { getTashkentDatePreset, toDateTerminalQuery } from '@/shared/filters/date-range'
import { createDefaultDynamicQrFilters } from './page-state'
import { restoreDefaultDynamicQrDateRange } from './quick-filters'
import { toDynamicQrQuery } from './filters'
import { toDynamicQrExportQuery } from './export-filters'

describe('Dynamic QR today date policy', () => {
  it.each([
    ['2026-10-07T18:59:00Z', '2026-10-07'],
    ['2026-10-07T19:30:00Z', '2026-10-08'],
  ])('uses Asia/Tashkent at %s, independent of browser timezone', (instant, today) => {
    const filters = createDefaultDynamicQrFilters(new Date(instant))
    expect(filters).toMatchObject({ fromDate: today, toDate: today, page: 0, size: 20 })
    for (const query of [toDynamicQrQuery(filters), toDynamicQrExportQuery(filters)]) {
      expect(query.fromDate).toBe(today)
      expect(query.toDate).toBe(today)
      expect(query.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(query.toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('resets dates and page together while preserving size, raw Search and structured filters', () => {
    const filters: DynamicQrFilters = {
      fromDate: '2026-10-01', toDate: '2026-10-07', search: '  Terminal !  ',
      merchantId: '1', bankAccountId: '1', terminalId: '1', status: 0,
      distributionStatus: 0, page: 3, size: 50,
    }
    const reset = restoreDefaultDynamicQrDateRange(filters, new Date('2026-10-07T19:30:00Z'))
    expect(reset).toEqual({ ...filters, fromDate: '2026-10-08', toDate: '2026-10-08', page: 0 })
    expect(toDateTerminalQuery(reset)).toEqual({ fromDate: '2026-10-08', toDate: '2026-10-08', terminalId: '1' })
    expect(filters.page).toBe(3)
  })

  it('keeps the shared Dashboard seven/thirty day arithmetic unchanged', () => {
    const instant = new Date('2026-10-07T19:30:00Z')
    expect(getTashkentDatePreset(7, instant)).toEqual({ fromDate: '2026-10-02', toDate: '2026-10-08' })
    expect(getTashkentDatePreset(30, instant)).toEqual({ fromDate: '2026-09-09', toDate: '2026-10-08' })
  })
})
