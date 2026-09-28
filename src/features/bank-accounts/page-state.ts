import { safeContractError } from '@/shared/api/errors'
import { applyManagementFilters, type BankAccountListFilters } from '@/shared/contracts/management-filters'

export function createDefaultBankAccountFilters(): BankAccountListFilters {
  return { search: '', page: 0, size: 10 }
}

export type MerchantLookupState = { readonly kind: 'ready'; readonly ids: readonly string[] } | { readonly kind: 'denied' | 'unavailable' | 'loading' | 'error' }

export function bankAccountParentState(merchantId: string | undefined, lookup: MerchantLookupState): 'ready' | 'pause' {
  if (!merchantId) return 'ready'
  return lookup.kind === 'ready' && lookup.ids.includes(merchantId) ? 'ready' : 'pause'
}

export function applyBankAccountDraft(draft: BankAccountListFilters, merchantIds?: readonly string[]): BankAccountListFilters {
  if (draft.merchantId && !merchantIds?.includes(draft.merchantId)) throw safeContractError()
  return applyManagementFilters(draft)
}
