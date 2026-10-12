import { applyEffectiveSearch } from '@/shared/filters/debounced-search'
import type {
  DateRange,
  DynamicQrFilters,
  QrStatusFilter,
  DistributionStatusFilter,
} from '@/shared/contracts/merchant-read'
import { getTashkentDatePreset, isValidDateRange } from '@/shared/filters/date-range'
import { safeContractError } from '@/shared/api/errors'
import { toDynamicQrQuery } from './filters'

export interface DynamicQrAdvancedFilterDraft {
  readonly merchantId?: string
  readonly bankAccountId?: string
  readonly terminalId?: string
  readonly status?: QrStatusFilter
  readonly distributionStatus?: DistributionStatusFilter
}

export interface FilterLookupEvidence {
  readonly enabled: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly ids?: readonly string[]
  readonly merchantId?: string
}

export interface DynamicQrStructuredLookups {
  readonly merchants: FilterLookupEvidence
  readonly banks: FilterLookupEvidence
  readonly terminals: FilterLookupEvidence
}

export function advancedDraftFromFilters(filters: DynamicQrAdvancedFilterDraft): DynamicQrAdvancedFilterDraft {
  return {
    merchantId: filters.merchantId?.trim() || undefined,
    bankAccountId: filters.bankAccountId?.trim() || undefined,
    terminalId: filters.terminalId?.trim() || undefined,
    status: filters.status,
    distributionStatus: filters.distributionStatus,
  }
}

export function changeDynamicQrMerchantDraft(draft: DynamicQrAdvancedFilterDraft, merchantId?: string): DynamicQrAdvancedFilterDraft {
  return { ...draft, merchantId, bankAccountId: undefined, terminalId: undefined }
}

export function changeDynamicQrBankDraft(draft: DynamicQrAdvancedFilterDraft, bankAccountId?: string): DynamicQrAdvancedFilterDraft {
  const nextBank = bankAccountId?.trim() || undefined
  if ((draft.bankAccountId?.trim() || undefined) === nextBank) return draft
  return { ...draft, bankAccountId: nextBank, terminalId: undefined }
}

export function reconcileDynamicQrLookupDraft(
  draft: DynamicQrAdvancedFilterDraft,
  lookups: DynamicQrStructuredLookups,
): DynamicQrAdvancedFilterDraft {
  const confirmedMissing = (id: string | undefined, lookup: FilterLookupEvidence) =>
    Boolean(id && lookup.enabled && !lookup.pending && !lookup.error && lookup.ids && !lookup.ids.includes(id.trim()))
  if (confirmedMissing(draft.merchantId, lookups.merchants)) {
    return changeDynamicQrMerchantDraft(draft, undefined)
  }
  // Never reconcile against a result from another parent or a failed/in-flight request.
  if ((lookups.banks.merchantId?.trim() || undefined) === (draft.merchantId?.trim() || undefined) &&
    confirmedMissing(draft.bankAccountId, lookups.banks)) {
    return changeDynamicQrBankDraft(draft, undefined)
  }
  return draft
}

export function getDynamicQrStructuredState(
  draft: DynamicQrAdvancedFilterDraft,
  lookups?: DynamicQrStructuredLookups,
): 'valid' | 'checking' | 'invalid' {
  let checking = false
  for (const [id, lookup, dependent] of [
    [draft.merchantId, lookups?.merchants, false],
    [draft.bankAccountId, lookups?.banks, true],
    [draft.terminalId, lookups?.terminals, true],
  ] as const) {
    const selected = id?.trim()
    if (!selected) continue
    if (!lookup?.enabled || lookup.error ||
      (dependent && (lookup.merchantId?.trim() || undefined) !== (draft.merchantId?.trim() || undefined))) return 'invalid'
    if (lookup.pending || !lookup.ids) checking = true
    else if (!lookup.ids.includes(selected)) return 'invalid'
  }
  return checking ? 'checking' : 'valid'
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
    ...getTashkentDatePreset(1, instant),
    page: 0,
  })
}

export function applyDynamicQrSearchQuickFilter(
  current: DynamicQrFilters,
  search: string,
): DynamicQrFilters {
  return applyEffectiveSearch(current, search)
}

export function applyDynamicQrAdvancedFilters(
  current: DynamicQrFilters,
  draft: DynamicQrAdvancedFilterDraft,
  lookups?: DynamicQrStructuredLookups,
): DynamicQrFilters {
  const structured = advancedDraftFromFilters(draft)
  if (getDynamicQrStructuredState(structured, lookups) !== 'valid') throw safeContractError()
  const next = Object.freeze({
    ...current,
    ...structured,
    page: 0,
  })
  toDynamicQrQuery(next)
  return next
}
