import { applyEffectiveSearch } from '@/shared/filters/debounced-search'
import { safeContractError } from '@/shared/api/errors'
import { applyManagementFilters, type BankAccountListFilters } from '@/shared/contracts/management-filters'
import { DEFAULT_PAGE_SIZE } from '@/shared/pagination'

export function createDefaultBankAccountFilters(): BankAccountListFilters {
  return { search: '', page: 0, size: DEFAULT_PAGE_SIZE }
}

export type MerchantLookupState = { readonly kind: 'ready'; readonly ids: readonly string[] } | { readonly kind: 'denied' | 'unavailable' | 'loading' | 'error' }

export function bankAccountParentState(merchantId: string | undefined, lookup: MerchantLookupState): 'ready' | 'pause' {
  if (!merchantId) return 'ready'
  return lookup.kind === 'ready' && lookup.ids.includes(merchantId) ? 'ready' : 'pause'
}

export function applyBankAccountDraft(draft: BankAccountListFilters, merchantIds?: readonly string[]): BankAccountListFilters {
  if (draft.merchantId && !merchantIds?.includes(draft.merchantId)) throw safeContractError()
  return { ...applyManagementFilters(draft), search: draft.search }
}

export type BankAccountMerchantDraft = Pick<BankAccountListFilters, 'merchantId'>

export function applyBankAccountMerchantDraft(
  applied: BankAccountListFilters,
  draft: BankAccountMerchantDraft,
  merchantIds?: readonly string[],
): BankAccountListFilters {
  return applyBankAccountDraft({ ...applied, merchantId: draft.merchantId }, merchantIds)
}

export function applyBankAccountQuickSearch(applied: BankAccountListFilters, search: string): BankAccountListFilters {
  return applyEffectiveSearch(applied, search)
}
