import { safeContractError } from '@/shared/api/errors'
import { applyManagementFilters, type DependentLookupGateInput, type TerminalListFilters } from '@/shared/contracts/management-filters'
import { DEFAULT_PAGE_SIZE } from '@/shared/pagination'

export function createDefaultTerminalFilters(): TerminalListFilters {
  return { search: '', page: 0, size: DEFAULT_PAGE_SIZE }
}

export type ParentLookupState = { readonly kind: 'ready'; readonly ids: readonly string[] } | { readonly kind: 'denied' | 'unavailable' | 'loading' | 'error' }

export function terminalParentState(merchantId: string | undefined, lookup: ParentLookupState): 'ready' | 'pause' {
  if (!merchantId) return 'ready'
  return lookup.kind === 'ready' && lookup.ids.includes(merchantId) ? 'ready' : 'pause'
}

export function applyTerminalDraft(draft: TerminalListFilters, input: { readonly merchantIds?: readonly string[]; readonly bank?: DependentLookupGateInput }): TerminalListFilters {
  if (draft.merchantId && !input.merchantIds?.includes(draft.merchantId)) throw safeContractError()
  return applyManagementFilters(draft, { bank: input.bank })
}
