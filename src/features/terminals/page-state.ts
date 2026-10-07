import { applyEffectiveSearch } from '@/shared/filters/debounced-search'
import { safeContractError } from '@/shared/api/errors'
import { applyManagementFilters, dependentReadGate, toTerminalListQuery, type DependentLookupGateInput, type TerminalListFilters } from '@/shared/contracts/management-filters'
import { DEFAULT_PAGE_SIZE } from '@/shared/pagination'

export function createDefaultTerminalFilters(): TerminalListFilters {
  return { search: '', page: 0, size: DEFAULT_PAGE_SIZE }
}

export type ParentLookupState = { readonly kind: 'ready'; readonly ids: readonly string[] } | { readonly kind: 'denied' | 'unavailable' | 'loading' | 'error' }

export function terminalParentState(merchantId: string | undefined, lookup: ParentLookupState): 'ready' | 'pause' {
  if (!merchantId) return 'ready'
  return lookup.kind === 'ready' && lookup.ids.includes(merchantId) ? 'ready' : 'pause'
}

export function applyTerminalDraft(draft: TerminalListFilters, input: { readonly merchantIds?: readonly string[]; readonly bank?: DependentLookupGateInput; readonly regionIds?: readonly string[]; readonly district?: DependentLookupGateInput }): TerminalListFilters {
  if (draft.merchantId && !input.merchantIds?.includes(draft.merchantId)) throw safeContractError()
  if (draft.regionId && !input.regionIds?.includes(draft.regionId)) throw safeContractError()
  if (draft.districtId && (!draft.regionId || dependentReadGate({ appliedParentId: draft.regionId,
    appliedChildId: draft.districtId, ...input.district, lookupState: input.district?.lookupState ?? 'unavailable' }) !== 'ready')) throw safeContractError()
  toTerminalListQuery(draft)
  return { ...applyManagementFilters(draft, { bank: input.bank }), search: draft.search }
}

export type TerminalAdvancedDraft = Pick<TerminalListFilters, 'merchantId' | 'bankAccountId' | 'regionId' | 'districtId'>

export function changeTerminalMerchantDraft(draft: TerminalAdvancedDraft, merchantId?: string): TerminalAdvancedDraft {
  return { ...draft, merchantId, bankAccountId: undefined }
}

export function changeTerminalRegionDraft(draft: TerminalAdvancedDraft, regionId?: string): TerminalAdvancedDraft {
  return { ...draft, regionId, districtId: undefined }
}

export function reconcileTerminalAdvancedDraft(draft: TerminalAdvancedDraft, input: {
  readonly merchant: ParentLookupState; readonly bank: DependentLookupGateInput
  readonly region: ParentLookupState; readonly district: DependentLookupGateInput
}): TerminalAdvancedDraft {
  let next = draft
  if (next.merchantId && input.merchant.kind === 'ready' && !input.merchant.ids.includes(next.merchantId)) {
    next = changeTerminalMerchantDraft(next, undefined)
  }
  if (next.bankAccountId && input.bank.lookupState === 'ready' && input.bank.lookupParentId === next.merchantId &&
    input.bank.optionIds && !input.bank.optionIds.includes(next.bankAccountId)) next = { ...next, bankAccountId: undefined }
  if (next.regionId && input.region.kind === 'ready' && !input.region.ids.includes(next.regionId)) {
    next = changeTerminalRegionDraft(next, undefined)
  }
  if (next.districtId && input.district.lookupState === 'ready' && input.district.lookupParentId === next.regionId &&
    input.district.optionIds && !input.district.optionIds.includes(next.districtId)) next = { ...next, districtId: undefined }
  return next
}

export function applyTerminalAdvancedDraft(applied: TerminalListFilters, draft: TerminalAdvancedDraft,
  input: Parameters<typeof applyTerminalDraft>[1]): TerminalListFilters {
  return applyTerminalDraft({ ...applied, merchantId: draft.merchantId, bankAccountId: draft.bankAccountId,
    regionId: draft.regionId, districtId: draft.districtId }, input)
}

export function applyTerminalQuickSearch(applied: TerminalListFilters, search: string): TerminalListFilters {
  return applyEffectiveSearch(applied, search)
}

export function resetTerminalFilters(filters: TerminalListFilters): TerminalListFilters {
  return { search: '', page: 0, size: filters.size }
}
