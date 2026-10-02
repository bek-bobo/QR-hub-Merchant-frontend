import { safeContractError } from '@/shared/api/errors'
import { applyManagementFilters, type CashierListFilters, type DependentLookupGateInput } from '@/shared/contracts/management-filters'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'
import { DEFAULT_PAGE_SIZE } from '@/shared/pagination'

export function createDefaultCashierFilters(): CashierListFilters {
  return { search: '', page: 0, size: DEFAULT_PAGE_SIZE }
}

export type MerchantLookupState = { readonly kind: 'ready'; readonly ids: readonly string[] } | { readonly kind: 'denied' | 'unavailable' | 'loading' | 'error' }

export function cashierParentState(merchantId: string | undefined, lookup: MerchantLookupState): 'ready' | 'pause' {
  if (!merchantId) return 'ready'
  return lookup.kind === 'ready' && lookup.ids.includes(merchantId) ? 'ready' : 'pause'
}

export function applyCashierDraft(draft: CashierListFilters, input: { readonly merchantIds?: readonly string[]; readonly terminal?: DependentLookupGateInput }): CashierListFilters {
  if (draft.merchantId && !input.merchantIds?.includes(draft.merchantId)) throw safeContractError()
  return applyManagementFilters(draft, { terminal: input.terminal })
}

export type CashierAdvancedDraft = Pick<CashierListFilters, 'merchantId' | 'terminalId'>

export function changeCashierMerchantDraft(draft: CashierAdvancedDraft, merchantId?: string): CashierAdvancedDraft {
  return { ...draft, merchantId, terminalId: undefined }
}

export function reconcileCashierAdvancedDraft(draft: CashierAdvancedDraft, merchant: MerchantLookupState,
  terminal: DependentLookupGateInput): CashierAdvancedDraft {
  if (draft.merchantId && merchant.kind === 'ready' && !merchant.ids.includes(draft.merchantId)) {
    return changeCashierMerchantDraft(draft, undefined)
  }
  if (draft.terminalId && terminal.lookupState === 'ready' && terminal.lookupParentId === draft.merchantId &&
    terminal.optionIds && !terminal.optionIds.includes(draft.terminalId)) {
    return { ...draft, terminalId: undefined }
  }
  return draft
}

export function applyCashierAdvancedDraft(applied: CashierListFilters, draft: CashierAdvancedDraft,
  input: Parameters<typeof applyCashierDraft>[1]): CashierListFilters {
  if (draft.terminalId && !draft.merchantId) throw safeContractError()
  return applyCashierDraft({ ...applied, merchantId: draft.merchantId, terminalId: draft.terminalId }, input)
}

export function applyCashierQuickSearch(applied: CashierListFilters, search: string): CashierListFilters {
  const normalized = search.trim()
  if (applied.search === normalized && applied.page === 0) return applied
  return { ...applied, search: normalized, page: 0 }
}

export interface CashierTarget {
  readonly scope: ReadScope
  readonly cashierId: string
}

export function createCashierTarget(row: CashierRow, scope: ReadScope): CashierTarget {
  return { scope: { ...scope }, cashierId: row.id }
}

export function cashierSelectionKey(queryKey: readonly unknown[], page: Page<CashierRow>): string {
  return JSON.stringify([queryKey, page.page, page.size, page.content.map((row) => row.id)])
}

export function resolveCashierTarget(target: CashierTarget | null, scope: ReadScope, rows: readonly CashierRow[], canRead: boolean): CashierRow | null {
  if (!target || !canRead || target.scope.source !== scope.source || target.scope.sessionScopeId !== scope.sessionScopeId || target.scope.accessRevision !== scope.accessRevision) return null
  return rows.find((row) => row.id === target.cashierId) ?? null
}
