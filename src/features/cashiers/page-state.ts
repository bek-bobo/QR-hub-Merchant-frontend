import { safeContractError } from '@/shared/api/errors'
import { applyManagementFilters, type CashierListFilters, type DependentLookupGateInput } from '@/shared/contracts/management-filters'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'

export function createDefaultCashierFilters(): CashierListFilters {
  return { search: '', page: 0, size: 10 }
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
