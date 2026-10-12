import { safeContractError } from '@/shared/api/errors'
import type { PageSize } from './merchant-read'

export interface ManagementFilters { readonly merchantId?: string; readonly bankAccountId?: string; readonly terminalId?: string; readonly search: string; readonly page: number; readonly size: PageSize }
export type TerminalListFilters = Pick<ManagementFilters, 'merchantId' | 'bankAccountId' | 'search' | 'page' | 'size'> & { readonly regionId?: string; readonly districtId?: string }
export type StaticQrListFilters = Pick<ManagementFilters, 'merchantId' | 'terminalId' | 'search' | 'page' | 'size'> & { readonly regionId?: string; readonly districtId?: string }
export type BankAccountListFilters = Pick<ManagementFilters, 'merchantId' | 'search' | 'page' | 'size'>
export type CashierListFilters = Pick<ManagementFilters, 'merchantId' | 'terminalId' | 'search' | 'page' | 'size'>

function optionalLongId(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(Number(trimmed))) throw safeContractError()
  return trimmed
}
function optionalText(value: string | undefined): string | undefined { return value?.trim() || undefined }
function base(filters: Pick<ManagementFilters, 'search' | 'page' | 'size'>): Record<string, string> {
  if (!Number.isSafeInteger(filters.page) || filters.page < 0 || !([10, 20, 25, 50] as readonly number[]).includes(filters.size)) throw safeContractError()
  const query: Record<string, string> = { page: String(filters.page), size: String(filters.size) }
  const search = filters.search
  if (search) query.search = search
  return query
}
export function toTerminalListQuery(filters: TerminalListFilters): Readonly<Record<string, string>> {
  const query = base(filters)
  const merchantId = optionalLongId(filters.merchantId)
  const bankAccountId = optionalLongId(filters.bankAccountId)
  if (merchantId) query.merchantId = merchantId
  if (bankAccountId) query.bankAccountId = bankAccountId
  const regionId = optionalLongId(filters.regionId)
  const districtId = optionalLongId(filters.districtId)
  if (districtId && !regionId) throw safeContractError()
  if (regionId) query.regionId = regionId
  if (districtId) query.districtId = districtId
  return Object.freeze(query)
}
export function toDistrictLookupQuery(regionId: string | undefined): Readonly<Record<string, string>> {
  const id = optionalLongId(regionId)
  if (!id) throw safeContractError()
  return Object.freeze({ regionId: id })
}
export function toStaticQrListQuery(filters: StaticQrListFilters): Readonly<Record<string, string>> {
  const query = base(filters)
  const merchantId = optionalLongId(filters.merchantId)
  const terminalId = optionalText(filters.terminalId)
  const regionId = optionalLongId(filters.regionId)
  const districtId = optionalLongId(filters.districtId)
  if (districtId && !regionId) throw safeContractError()
  if (merchantId) query.merchantId = merchantId
  if (terminalId) query.terminalId = terminalId
  if (regionId) query.regionId = regionId
  if (districtId) query.districtId = districtId
  return Object.freeze(query)
}
export function toBankAccountListQuery(filters: BankAccountListFilters): Readonly<Record<string, string>> {
  const query = base(filters)
  const merchantId = optionalLongId(filters.merchantId)
  if (merchantId) query.merchantId = merchantId
  return Object.freeze(query)
}
export function toCashierListQuery(filters: CashierListFilters): Readonly<Record<string, string>> {
  const query = base({ ...filters, search: filters.search.trim() })
  const merchantId = optionalLongId(filters.merchantId)
  const terminalId = optionalText(filters.terminalId)
  if (merchantId) query.merchantId = merchantId
  if (terminalId) query.terminalId = terminalId
  return Object.freeze(query)
}
export function toMerchantLookupQuery(merchantId: string | undefined): Readonly<Record<string, string>> {
  const id = optionalLongId(merchantId)
  const query: Record<string, string> = {}
  if (id) query.merchantId = id
  return Object.freeze(query)
}
export function changeMerchantDraft<T extends ManagementFilters>(draft: T, merchantId?: string): T {
  return { ...draft, merchantId, bankAccountId: undefined, terminalId: undefined }
}
export function applyManagementFilters<T extends ManagementFilters>(draft: T, lookups?: { readonly bank?: DependentLookupGateInput; readonly terminal?: DependentLookupGateInput }): T {
  if (dependentReadGate({ appliedParentId: draft.merchantId, appliedChildId: draft.bankAccountId, ...lookups?.bank, lookupState: lookups?.bank?.lookupState ?? 'unavailable' }) === 'pause' || dependentReadGate({ appliedParentId: draft.merchantId, appliedChildId: draft.terminalId, ...lookups?.terminal, lookupState: lookups?.terminal?.lookupState ?? 'unavailable' }) === 'pause') throw safeContractError()
  return { ...draft, search: draft.search.trim(), page: 0 }
}
export function clearManagementFilters<T extends ManagementFilters>(filters: T): T {
  return { ...filters, merchantId: undefined, bankAccountId: undefined, terminalId: undefined, search: '', page: 0 }
}
export function changeManagementPage<T extends ManagementFilters>(filters: T, page: number): T {
  if (!Number.isSafeInteger(page) || page < 0) throw safeContractError()
  return { ...filters, page }
}
export type LookupState = 'ready' | 'denied' | 'unavailable' | 'error' | 'loading'
export interface DependentLookupGateInput { readonly lookupParentId?: string; readonly lookupState: LookupState; readonly optionIds?: readonly string[] }
export function dependentReadGate(input: { readonly appliedParentId?: string; readonly appliedChildId?: string } & DependentLookupGateInput): 'ready' | 'pause' {
  if (!input.appliedChildId) return 'ready'
  if (input.lookupState !== 'ready' || input.appliedParentId !== input.lookupParentId || !input.optionIds?.includes(input.appliedChildId)) return 'pause'
  return 'ready'
}
