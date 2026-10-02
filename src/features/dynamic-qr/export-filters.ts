import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { isValidDateRange } from '@/shared/filters/date-range'
import { toDynamicQrQuery } from './filters'

export function toDynamicQrExportQuery(filters: DynamicQrFilters): Readonly<Record<string, string>> {
  if (!isValidDateRange(filters)) throw new TypeError('Invalid export date range.')
  // Validate effective filters independently of local list pagination.
  const query: Record<string, string> = { ...toDynamicQrQuery({ ...filters, page: 0, size: 20 }) }
  delete query.page
  delete query.size
  return Object.freeze(query)
}
