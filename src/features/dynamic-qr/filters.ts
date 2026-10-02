import { safeContractError } from '@/shared/api/errors'
import type {
  DynamicQrFilters,
  PageSize,
  QrStatusFilter,
  DistributionStatusFilter,
} from '@/shared/contracts/merchant-read'
import { isValidDateRange } from '@/shared/filters/date-range'

export interface DynamicQrFilterDraft {
  readonly fromDate: string
  readonly toDate: string
  readonly terminalId?: string
  readonly merchantId?: string
  readonly bankAccountId?: string
  readonly status?: QrStatusFilter
  readonly distributionStatus?: DistributionStatusFilter
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
    ...(draft.merchantId?.trim() ? { merchantId: draft.merchantId.trim() } : {}),
    ...(draft.bankAccountId?.trim() ? { bankAccountId: draft.bankAccountId.trim() } : {}),
    ...(draft.distributionStatus === undefined ? {} : { distributionStatus: draft.distributionStatus }),
    search: draft.search.trim(),
    page: 0,
    size: draft.size,
  })
}

export function toDynamicQrQuery(
  filters: DynamicQrFilters,
): Readonly<Record<string, string>> {
  const allowedStatuses: readonly number[] = [0, 5, 10, 20, 25, 50]
  const distributionStatuses: readonly number[] = [0, 5, 10, 20, 50]
  if (
    !isValidDateRange(filters) ||
    !Number.isSafeInteger(filters.page) ||
    filters.page < 0 ||
    !([10, 20, 25, 50] as readonly number[]).includes(filters.size) ||
    (filters.status !== undefined && !allowedStatuses.includes(filters.status)) ||
    (filters.distributionStatus !== undefined && !distributionStatuses.includes(filters.distributionStatus))
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
  for (const name of ['merchantId', 'bankAccountId'] as const) {
    const id = filters[name]?.trim()
    if (!id) continue
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) throw safeContractError()
    query[name] = id
  }
  const search = filters.search.trim()
  if (terminalId) {
    query.terminalId = terminalId
  }
  if (filters.status !== undefined) {
    query.status = String(filters.status)
  }
  if (filters.distributionStatus !== undefined) query.distributionStatus = String(filters.distributionStatus)
  if (search) {
    query.search = search
  }

  return Object.freeze(query)
}
