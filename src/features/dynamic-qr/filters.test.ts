import { describe, expect, it } from 'vitest'
import { applyQrFilters, toDynamicQrQuery } from './filters'

describe('dynamic QR filters', () => {
  it('preserves status zero, trims search, resets page, and omits forbidden fields', () => {
    const applied = applyQrFilters({
      fromDate: '2026-09-01',
      toDate: '2026-09-15',
      search: '  Terminal A  ',
      status: 0,
      page: 9,
      size: 25,
    })

    expect(applied.page).toBe(0)
    expect(toDynamicQrQuery(applied)).toEqual({
      fromDate: '2026-09-01',
      toDate: '2026-09-15',
      status: '0',
      search: 'Terminal A',
      page: '0',
      size: '25',
    })
  })

  it('omits blank search and rejects reversed dates', () => {
    const applied = applyQrFilters({
      fromDate: '2026-09-01',
      toDate: '2026-09-15',
      search: '  ',
      page: 2,
      size: 10,
    })
    expect(toDynamicQrQuery(applied)).not.toHaveProperty('search')
    expect(() =>
      applyQrFilters({
        fromDate: '2026-09-15',
        toDate: '2026-09-01',
        search: '',
        page: 0,
        size: 10,
      }),
    ).toThrow()
  })
})
