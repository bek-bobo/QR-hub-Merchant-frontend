import { safeContractError } from '@/shared/api/errors'
import type { PageSize } from './merchant-read'
import { dependentReadGate, type DependentLookupGateInput } from './management-filters'

export interface P5Filters {
  readonly merchantId?: string
  readonly terminalId?: string
  readonly status?: number
  readonly search: string
  readonly page: number
  readonly size: PageSize
}

function optionalLongId(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(Number(trimmed))) throw safeContractError()
  return trimmed
}

function optionalText(value: string | undefined): string | undefined {
  return value?.trim() || undefined
}

function integerStatus(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value) || value < -2_147_483_648 || value > 2_147_483_647) throw safeContractError()
  return value
}

export function toP5ListQuery(filters: P5Filters): Readonly<Record<string, string>> {
  if (!Number.isSafeInteger(filters.page) || filters.page < 0 || !([10, 25, 50] as readonly number[]).includes(filters.size)) throw safeContractError()
  const query: Record<string, string> = { page: String(filters.page), size: String(filters.size) }
  const merchantId = optionalLongId(filters.merchantId)
  const terminalId = optionalText(filters.terminalId)
  const status = integerStatus(filters.status)
  const search = optionalText(filters.search)
  if (merchantId) query.merchantId = merchantId
  if (terminalId) query.terminalId = terminalId
  if (status !== undefined) query.status = String(status)
  if (search) query.search = search
  return Object.freeze(query)
}

export function changeP5MerchantDraft<T extends P5Filters>(draft: T, merchantId?: string): T {
  return { ...draft, merchantId, terminalId: undefined }
}

export function applyP5Filters<T extends P5Filters>(draft: T, terminalGate?: DependentLookupGateInput): T {
  if (dependentReadGate({ appliedParentId: draft.merchantId, appliedChildId: draft.terminalId, ...terminalGate, lookupState: terminalGate?.lookupState ?? 'unavailable' }) === 'pause') throw safeContractError()
  return { ...draft, search: draft.search.trim(), page: 0 }
}

export function clearP5Filters<T extends P5Filters>(filters: T): T {
  return { ...filters, merchantId: undefined, terminalId: undefined, status: undefined, search: '', page: 0 }
}

export function changeP5Page<T extends P5Filters>(filters: T, page: number): T {
  if (!Number.isSafeInteger(page) || page < 0) throw safeContractError()
  return { ...filters, page }
}

export function changeP5Size<T extends P5Filters>(filters: T, size: PageSize): T {
  if (!([10, 25, 50] as readonly number[]).includes(size)) throw safeContractError()
  return { ...filters, size, page: 0 }
}
