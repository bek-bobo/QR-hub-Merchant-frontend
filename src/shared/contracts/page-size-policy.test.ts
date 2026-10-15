import { describe, expect, it } from 'vitest'
import { PAGE_SIZE_OPTIONS } from '@/shared/pagination'
import { toDynamicQrQuery } from '@/features/dynamic-qr/filters'
import { toBankAccountListQuery, toCashierListQuery, toStaticQrListQuery, toTerminalListQuery } from './management-filters'
import { toP5ListQuery } from './p5-filters'

const queries = [toDynamicQrQuery, toBankAccountListQuery, toCashierListQuery, toStaticQrListQuery, toTerminalListQuery, toP5ListQuery]
describe('shared page-size query policy', () => {
  it.each(PAGE_SIZE_OPTIONS)('serializes size=%s across all six paginated list contracts without changing dates/search/page', (size) => {
    const filters = { fromDate: '2026-12-31', toDate: '2027-01-02', search: ' exact search ', page: 3, size }
    for (const query of queries) expect(query(filters)).toMatchObject({
      search: query === toCashierListQuery ? filters.search.trim() : filters.search,
      page: '3', size: String(size),
    })
    expect(toDynamicQrQuery(filters)).toMatchObject({ fromDate: filters.fromDate, toDate: filters.toDate })
  })
  it.each([25, 0, 101, 10.5])('rejects unsupported size=%s consistently before dispatch', (size) => {
    for (const query of queries) expect(() => query({ fromDate: '2026-10-15', toDate: '2026-10-15', search: '', page: 0, size } as never)).toThrow()
  })
})
