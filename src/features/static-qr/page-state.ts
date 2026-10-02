import type { TerminalOption } from '@/shared/contracts/merchant-read'
import { dependentReadGate, toStaticQrListQuery, type DependentLookupGateInput, type StaticQrListFilters } from '@/shared/contracts/management-filters'
import { DEFAULT_PAGE_SIZE } from '@/shared/pagination'

export type StaticQrFilters = StaticQrListFilters
export type StaticQrAdvancedDraft = Pick<StaticQrFilters, 'merchantId' | 'terminalId' | 'regionId' | 'districtId'>
export interface StaticQrLookupEvidence {
  readonly merchant: DependentLookupGateInput
  readonly terminal: DependentLookupGateInput
  readonly region: DependentLookupGateInput
  readonly district: DependentLookupGateInput
}

export interface StaticTerminalLookup {
  readonly enabled: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly terminals?: readonly TerminalOption[]
}

export const defaultStaticFilters: StaticQrFilters = Object.freeze({ search: '', page: 0, size: DEFAULT_PAGE_SIZE })

export function getStaticTerminalState(filters: StaticQrFilters, lookup: StaticTerminalLookup): 'valid' | 'unconfirmed' {
  if (!filters.terminalId) return 'valid'
  return lookup.enabled && !lookup.pending && !lookup.error &&
    lookup.terminals?.some((item) => item.id === filters.terminalId)
    ? 'valid' : 'unconfirmed'
}

export function applyStaticTerminal(
  current: StaticQrFilters,
  draftTerminalId: string,
  lookup: StaticTerminalLookup,
): StaticQrFilters | null {
  const next: StaticQrFilters = Object.freeze({
    ...current, terminalId: draftTerminalId.trim() || undefined, page: 0,
  })
  return getStaticTerminalState(next, lookup) === 'valid' ? next : null
}

export function clearStaticTerminal(current: StaticQrFilters): StaticQrFilters {
  return Object.freeze({ search: '', page: 0, size: current.size })
}

export function toStaticQrQuery(filters: StaticQrFilters): Readonly<Record<string, string>> {
  return toStaticQrListQuery(filters)
}

export function changeStaticMerchantDraft(draft: StaticQrAdvancedDraft, merchantId?: string): StaticQrAdvancedDraft {
  return { ...draft, merchantId, terminalId: undefined }
}

export function changeStaticRegionDraft(draft: StaticQrAdvancedDraft, regionId?: string): StaticQrAdvancedDraft {
  return { ...draft, regionId, districtId: undefined }
}

export function staticQrFiltersConfirmed(filters: StaticQrAdvancedDraft, lookups: StaticQrLookupEvidence): boolean {
  return (!filters.districtId || Boolean(filters.regionId)) &&
    dependentReadGate({ appliedChildId: filters.merchantId, ...lookups.merchant }) === 'ready' &&
    dependentReadGate({ appliedParentId: filters.merchantId, appliedChildId: filters.terminalId, ...lookups.terminal }) === 'ready' &&
    dependentReadGate({ appliedChildId: filters.regionId, ...lookups.region }) === 'ready' &&
    dependentReadGate({ appliedParentId: filters.regionId, appliedChildId: filters.districtId, ...lookups.district }) === 'ready'
}

export function reconcileStaticQrDraft(draft: StaticQrAdvancedDraft, lookups: StaticQrLookupEvidence): StaticQrAdvancedDraft {
  let next = draft
  if (next.merchantId && lookups.merchant.lookupState === 'ready' && lookups.merchant.optionIds &&
    !lookups.merchant.optionIds.includes(next.merchantId)) next = changeStaticMerchantDraft(next, undefined)
  if (next.terminalId && lookups.terminal.lookupState === 'ready' && lookups.terminal.lookupParentId === next.merchantId &&
    lookups.terminal.optionIds && !lookups.terminal.optionIds.includes(next.terminalId)) next = { ...next, terminalId: undefined }
  if (next.regionId && lookups.region.lookupState === 'ready' && lookups.region.optionIds &&
    !lookups.region.optionIds.includes(next.regionId)) next = changeStaticRegionDraft(next, undefined)
  if (next.districtId && lookups.district.lookupState === 'ready' && lookups.district.lookupParentId === next.regionId &&
    lookups.district.optionIds && !lookups.district.optionIds.includes(next.districtId)) next = { ...next, districtId: undefined }
  return next
}

export function applyStaticQrAdvancedDraft(applied: StaticQrFilters, draft: StaticQrAdvancedDraft,
  lookups: StaticQrLookupEvidence): StaticQrFilters | null {
  if (!staticQrFiltersConfirmed(draft, lookups)) return null
  const next = { ...applied, merchantId: draft.merchantId, terminalId: draft.terminalId,
    regionId: draft.regionId, districtId: draft.districtId, page: 0 }
  try { toStaticQrQuery(next) } catch { return null }
  return Object.freeze(next)
}

export function applyStaticQrQuickSearch(applied: StaticQrFilters, search: string): StaticQrFilters {
  const normalized = search.trim()
  if (applied.search === normalized && applied.page === 0) return applied
  return Object.freeze({ ...applied, search: normalized, page: 0 })
}
