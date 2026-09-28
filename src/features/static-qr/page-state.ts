import type { PageSize, TerminalOption } from '@/shared/contracts/merchant-read'

export interface StaticQrFilters {
  readonly terminalId?: string
  readonly page: number
  readonly size: PageSize
}

export interface StaticTerminalLookup {
  readonly enabled: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly terminals?: readonly TerminalOption[]
}

export const defaultStaticFilters: StaticQrFilters = Object.freeze({ page: 0, size: 10 })

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
    ...(draftTerminalId ? { terminalId: draftTerminalId } : {}), page: 0, size: current.size,
  })
  return getStaticTerminalState(next, lookup) === 'valid' ? next : null
}

export function clearStaticTerminal(current: StaticQrFilters): StaticQrFilters {
  return Object.freeze({ page: 0, size: current.size })
}

export function changeStaticPageSize(current: StaticQrFilters, rawSize: string): StaticQrFilters {
  if (rawSize !== '10' && rawSize !== '25' && rawSize !== '50') throw new Error('Unsupported static QR page size.')
  return Object.freeze({ ...current, page: 0, size: Number(rawSize) as PageSize })
}

export function toStaticQrQuery(filters: StaticQrFilters): Readonly<Record<string, string>> {
  return Object.freeze({ page: String(filters.page), size: String(filters.size),
    ...(filters.terminalId ? { terminalId: filters.terminalId } : {}) })
}
