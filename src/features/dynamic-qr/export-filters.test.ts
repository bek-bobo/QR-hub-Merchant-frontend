import { describe, expect, it } from 'vitest'
import { toDynamicQrExportQuery } from './export-filters'

describe('dynamic QR export filters', () => {
  it('uses applied filters, preserves status zero and excludes pagination', () => {
    expect(toDynamicQrExportQuery({ fromDate: '2026-09-09', toDate: '2026-09-15',
      terminalId: ' a ', status: 0, search: ' Chilonzor ', page: 3, size: 50 }))
      .toEqual({ fromDate: '2026-09-09', toDate: '2026-09-15',
        terminalId: 'a', status: '0', search: 'Chilonzor' })
  })
  it('omits blank optional fields while preserving the applied date range', () => {
    const query = toDynamicQrExportQuery({ fromDate: '2026-09-09', toDate: '2026-09-15',
      terminalId: ' ', search: '  ', page: 4, size: 25 })
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
