import { describe, expect, it } from 'vitest'
import { applyQrFilters, toDynamicQrQuery } from './filters'

describe('dynamic QR filters', () => {
  it('serializes every effective list field, including the independent status codes', () => {
    const filters = applyQrFilters({ fromDate: '2026-09-01', toDate: '2026-09-15',
      merchantId: ' 1 ', bankAccountId: ' 2 ', terminalId: ' terminal-a ', status: 25,
      distributionStatus: 20, search: ' Terminal A ', page: 9, size: 20 })
    expect(filters).toMatchObject({ merchantId: '1', bankAccountId: '2', distributionStatus: 20, status: 25 })
    expect(toDynamicQrQuery(filters)).toEqual({ fromDate: '2026-09-01', toDate: '2026-09-15',
      merchantId: '1', bankAccountId: '2', terminalId: 'terminal-a', status: '25',
      distributionStatus: '20', search: 'Terminal A', page: '0', size: '20' })
  })
  it('omits empty optional IDs and rejects malformed IDs', () => {
    const filters = { fromDate: '2026-09-01', toDate: '2026-09-15', merchantId: ' ', bankAccountId: '',
      terminalId: ' ', search: ' ', page: 0, size: 20 as const }
    expect(toDynamicQrQuery(filters)).toEqual({ fromDate: filters.fromDate, toDate: filters.toDate, page: '0', size: '20' })
    expect(() => toDynamicQrQuery({ ...filters, merchantId: 'invalid' })).toThrow()
    expect(() => toDynamicQrQuery({ ...filters, bankAccountId: '9007199254740992' })).toThrow()
  })
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
