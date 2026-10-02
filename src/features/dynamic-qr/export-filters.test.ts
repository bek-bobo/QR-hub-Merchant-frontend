import { describe, expect, it } from 'vitest'
import { toDynamicQrExportQuery } from './export-filters'

describe('dynamic QR export filters', () => {
  it('includes all effective filters and changes intent identity for each added selection', () => {
    const filters = { fromDate: '2026-09-09', toDate: '2026-09-15', merchantId: ' 1 ', bankAccountId: ' 2 ',
      terminalId: ' a ', status: 25 as const, distributionStatus: 20 as const, search: ' Name ', page: 3, size: 20 as const }
    const query = toDynamicQrExportQuery(filters)
    expect(query).toEqual({ fromDate: filters.fromDate, toDate: filters.toDate, merchantId: '1', bankAccountId: '2',
      terminalId: 'a', status: '25', distributionStatus: '20', search: 'Name' })
    for (const change of [{ merchantId: '3' }, { bankAccountId: '4' }, { distributionStatus: 0 as const }]) {
      expect(JSON.stringify(toDynamicQrExportQuery({ ...filters, ...change }))).not.toBe(JSON.stringify(query))
    }
    expect(toDynamicQrExportQuery({ ...filters, page: 10, size: 50 })).toEqual(query)
  })
  it('uses applied filters, preserves status zero and excludes pagination', () => {
    expect(toDynamicQrExportQuery({ fromDate: '2026-09-09', toDate: '2026-09-15',
      terminalId: ' a ', status: 0, search: ' Chilonzor ', page: 3, size: 50 }))
      .toEqual({ fromDate: '2026-09-09', toDate: '2026-09-15',
        terminalId: 'a', status: '0', search: 'Chilonzor' })
  })
  it('omits blank optional fields while preserving the applied date range', () => {
    const query = toDynamicQrExportQuery({ fromDate: '2026-09-09', toDate: '2026-09-15',
      merchantId: ' ', bankAccountId: '', terminalId: ' ', search: '  ', page: 4, size: 25 })
    expect(query).toEqual({ fromDate: '2026-09-09', toDate: '2026-09-15' })
    expect(query).not.toHaveProperty('page')
    expect(query).not.toHaveProperty('size')
  })
  it('does not change export identity when only the list page changes', () => {
    const applied = { fromDate: '2026-09-09', toDate: '2026-09-15',
      terminalId: 'terminal-1', search: 'Name', page: 0, size: 10 as const }
    expect(toDynamicQrExportQuery({ ...applied, page: 5 }))
      .toEqual(toDynamicQrExportQuery(applied))
  })
})
