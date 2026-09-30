import type {
  DateRange,
  DynamicQrFilters,
  QrStatusFilter,
} from '@/shared/contracts/merchant-read'
import { getTashkentDatePreset, isValidDateRange } from '@/shared/filters/date-range'

export interface DynamicQrAdvancedFilterDraft {
  readonly terminalId?: string
  readonly status?: QrStatusFilter
}

export function applyDynamicQrDateQuickFilter(
  current: DynamicQrFilters,
  range: DateRange,
): DynamicQrFilters | null {
  if (!isValidDateRange(range)) {
    return null
  }

  return Object.freeze({ ...current, ...range, page: 0 })
}

export function restoreDefaultDynamicQrDateRange(
  current: DynamicQrFilters,
  instant = new Date(),
): DynamicQrFilters {
  return Object.freeze({
    ...current,
    ...getTashkentDatePreset(7, instant),
    page: 0,
  })
}

export function applyDynamicQrSearchQuickFilter(
  current: DynamicQrFilters,
  search: string,
): DynamicQrFilters {
  return Object.freeze({ ...current, search: search.trim(), page: 0 })
}

export function applyDynamicQrAdvancedFilters(
  current: DynamicQrFilters,
  draft: DynamicQrAdvancedFilterDraft,
): DynamicQrFilters {
  const terminalId = draft.terminalId?.trim() || undefined
  return Object.freeze({
    ...current,
    terminalId,
    status: draft.status,
    page: 0,
  })
}
