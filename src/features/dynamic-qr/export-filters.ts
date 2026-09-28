import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { isValidDateRange } from '@/shared/filters/date-range'

export function toDynamicQrExportQuery(filters: DynamicQrFilters): Readonly<Record<string, string>> {
  if (!isValidDateRange(filters)) throw new TypeError('Invalid export date range.')
  const query: Record<string, string> = {
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  }
  if (filters.terminalId?.trim()) query.terminalId = filters.terminalId.trim()
  if (filters.status !== undefined) query.status = String(filters.status)
  if (filters.search.trim()) query.search = filters.search.trim()
  return Object.freeze(query)
}
