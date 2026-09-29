import { safeContractError } from '@/shared/api/errors'
import type {
  DynamicQrFilters,
  PageSize,
  QrStatusFilter,
} from '@/shared/contracts/merchant-read'
import { isValidDateRange } from '@/shared/filters/date-range'

export interface DynamicQrFilterDraft {
  readonly fromDate: string
  readonly toDate: string
  readonly terminalId?: string
  readonly status?: QrStatusFilter
  readonly search: string
  readonly page: number
  readonly size: PageSize
}

export function applyQrFilters(
  draft: DynamicQrFilterDraft,
): DynamicQrFilters {
  if (!isValidDateRange(draft)) {
    throw safeContractError()
  }

  return Object.freeze({
    fromDate: draft.fromDate,
    toDate: draft.toDate,
    ...(draft.terminalId?.trim()
      ? { terminalId: draft.terminalId.trim() }
      : {}),
    ...(draft.status === undefined ? {} : { status: draft.status }),
    search: draft.search.trim(),
    page: 0,
    size: draft.size,
  })
}

export function toDynamicQrQuery(
  filters: DynamicQrFilters,
): Readonly<Record<string, string>> {
  const allowedStatuses: readonly number[] = [0, 5, 10, 20, 50]
  if (
    !isValidDateRange(filters) ||
    !Number.isSafeInteger(filters.page) ||
    filters.page < 0 ||
    !([10, 20, 25, 50] as readonly number[]).includes(filters.size) ||
    (filters.status !== undefined && !allowedStatuses.includes(filters.status))
  ) {
    throw safeContractError()
  }

  const query: Record<string, string> = {
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    page: String(filters.page),
    size: String(filters.size),
  }
  const terminalId = filters.terminalId?.trim()
  const search = filters.search.trim()
  if (terminalId) {
    query.terminalId = terminalId
  }
  if (filters.status !== undefined) {
    query.status = String(filters.status)
  }
  if (search) {
    query.search = search
  }

  return Object.freeze(query)
}
