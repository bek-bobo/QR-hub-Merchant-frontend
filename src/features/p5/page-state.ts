import { safeContractError } from '@/shared/api/errors'
import { applyP5Filters, toP5ListQuery, type P5Filters } from '@/shared/contracts/p5-filters'
import type { DependentLookupGateInput } from '@/shared/contracts/management-filters'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { P5Row } from '@/shared/contracts/p5-read'
import type { StatusTone } from '@/shared/presentation/status-tone'
import { DEFAULT_PAGE_SIZE } from '@/shared/pagination'

export function createDefaultP5Filters(): P5Filters {
  return { search: '', page: 0, size: DEFAULT_PAGE_SIZE }
}

export type P5StatusDraft = { readonly mode: 'all' | '0' | '1' | 'custom'; readonly code: string }
export type P5AdvancedDraft = Pick<P5Filters, 'merchantId' | 'terminalId'> & { readonly statusDraft: P5StatusDraft }

export function createP5AdvancedDraft(filters: P5Filters = createDefaultP5Filters()): P5AdvancedDraft {
  const mode = filters.status === undefined ? 'all' : filters.status === 0 ? '0' : filters.status === 1 ? '1' : 'custom'
  return { merchantId: filters.merchantId, terminalId: filters.terminalId,
    statusDraft: { mode, code: mode === 'custom' ? String(filters.status) : '' } }
}

export function resolveP5StatusDraft(draft: P5StatusDraft): number | undefined {
  if (draft.mode === 'all') return undefined
  if (draft.mode === '0' || draft.mode === '1') return Number(draft.mode)
  const value = Number(draft.code.trim())
  if (!draft.code.trim() || !Number.isSafeInteger(value) || value < -2147483648 || value > 2147483647) throw safeContractError()
  return value
}

export function isP5StatusDraftValid(draft: P5StatusDraft): boolean {
  try { resolveP5StatusDraft(draft); return true } catch { return false }
}

export function changeP5AdvancedMerchant(draft: P5AdvancedDraft, merchantId?: string): P5AdvancedDraft {
  return { ...draft, merchantId, terminalId: undefined }
}

export function reconcileP5AdvancedDraft(draft: P5AdvancedDraft, merchant: MerchantLookupState,
  terminal: DependentLookupGateInput): P5AdvancedDraft {
  if (draft.merchantId && merchant.kind === 'ready' && !merchant.ids.includes(draft.merchantId)) return changeP5AdvancedMerchant(draft, undefined)
  if (draft.terminalId && terminal.lookupState === 'ready' && terminal.lookupParentId === draft.merchantId &&
    terminal.optionIds && !terminal.optionIds.includes(draft.terminalId)) return { ...draft, terminalId: undefined }
  return draft
}

export function applyP5AdvancedDraft(applied: P5Filters, draft: P5AdvancedDraft,
  input: Parameters<typeof applyP5Draft>[1]): P5Filters {
  return applyP5Draft({ ...applied, merchantId: draft.merchantId, terminalId: draft.terminalId,
    status: resolveP5StatusDraft(draft.statusDraft) }, input)
}

export function applyP5QuickSearch(applied: P5Filters, search: string): P5Filters {
  const normalized = search.trim()
  return applied.search === normalized && applied.page === 0 ? applied : { ...applied, search: normalized, page: 0 }
}

export type MerchantLookupState =
  | { readonly kind: 'ready'; readonly ids: readonly string[] }
  | { readonly kind: 'denied' | 'unavailable' | 'loading' | 'error' }

export function p5ParentState(merchantId: string | undefined, lookup: MerchantLookupState): 'ready' | 'pause' {
  if (!merchantId) return 'ready'
  return lookup.kind === 'ready' && lookup.ids.includes(merchantId) ? 'ready' : 'pause'
}

export function applyP5Draft(draft: P5Filters, input: {
  readonly merchantIds?: readonly string[]
  readonly terminal?: DependentLookupGateInput
}): P5Filters {
  if (draft.merchantId && !input.merchantIds?.includes(draft.merchantId)) throw safeContractError()
  if (draft.terminalId && !draft.merchantId) throw safeContractError()
  const applied = applyP5Filters(draft, input.terminal)
  toP5ListQuery(applied)
  return applied
}

export interface P5StatusPresentation {
  readonly label: string
  readonly active: boolean
  readonly tone: StatusTone
}

export function presentP5Status(status: number | null): P5StatusPresentation {
  if (status === 0) return { label: 'Faol', active: true, tone: 'success' }
  if (status === 1) return { label: 'Faol emas / administrator belgisi', active: false, tone: 'neutral' }
  return { label: 'Holat noma’lum', active: false, tone: 'neutral' }
}

export interface P5Target {
  readonly scope: ReadScope
  readonly queryKey: string
  readonly deviceId: string
  readonly rowFingerprint: string
}

function fingerprint(row: P5Row): string {
  return JSON.stringify([
    row.deviceId, row.description, row.deviceStatus, row.terminalId, row.terminalName,
    row.terminalType, row.merchantName, row.staticQrId, row.staticQrLink,
    row.staticQrStatus, row.createdAt,
  ])
}

export function createP5Target(row: P5Row, scope: ReadScope, queryKey: readonly unknown[]): P5Target {
  return { scope: { ...scope }, queryKey: JSON.stringify(queryKey), deviceId: row.deviceId, rowFingerprint: fingerprint(row) }
}

export function resolveP5Target(target: P5Target | null, scope: ReadScope, queryKey: readonly unknown[], rows: readonly P5Row[], canRead: boolean): P5Row | null {
  if (!target || !canRead || target.scope.source !== scope.source || target.scope.sessionScopeId !== scope.sessionScopeId || target.scope.accessRevision !== scope.accessRevision || target.queryKey !== JSON.stringify(queryKey)) return null
  const matches = rows.filter((row) => row.deviceId === target.deviceId)
  return matches.length === 1 && fingerprint(matches[0]) === target.rowFingerprint ? matches[0] : null
}

export function p5SelectionKey(queryKey: readonly unknown[], rows: readonly P5Row[]): string {
  return JSON.stringify([queryKey, rows.map((row) => fingerprint(row))])
}
