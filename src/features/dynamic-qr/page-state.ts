import { safeContractError } from '@/shared/api/errors'
import type {
  DashboardFilters,
  DynamicQrFilters,
  QrStatusFilter,
  TerminalOption,
} from '@/shared/contracts/merchant-read'
import { DEFAULT_PAGE_SIZE } from '@/shared/pagination'
import {
  getTashkentDatePreset,
  isValidDateRange,
} from '@/shared/filters/date-range'

export type TerminalFilterState = 'valid' | 'checking' | 'invalid'

export interface TerminalLookupState {
  readonly lookupEnabled: boolean
  readonly lookupPending: boolean
  readonly lookupError: boolean
  readonly terminals?: readonly TerminalOption[]
}

export function createDefaultDynamicQrFilters(
  instant = new Date(),
): DynamicQrFilters {
  return Object.freeze({
    ...getTashkentDatePreset(7, instant),
    status: undefined,
    search: '',
    page: 0,
    size: DEFAULT_PAGE_SIZE,
  })
}

export function parseQrStatusInput(
  value: string,
): QrStatusFilter | undefined {
  switch (value) {
    case '':
      return undefined
    case '0':
      return 0
    case '5':
      return 5
    case '10':
      return 10
    case '20':
      return 20
    case '25':
      return 25
    case '50':
      return 50
    default:
      throw safeContractError()
  }
}

export function changeDynamicQrPage(
  filters: DynamicQrFilters,
  page: number,
): DynamicQrFilters {
  if (!Number.isSafeInteger(page) || page < 0) {
    throw safeContractError()
  }
  return Object.freeze({ ...filters, page })
}

export function parseDashboardDynamicQrState(
  value: unknown,
): DashboardFilters | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  const source = value as Record<string, unknown>
  if (
    typeof source.fromDate !== 'string' ||
    typeof source.toDate !== 'string'
  ) {
    return null
  }

  const range = {
    fromDate: source.fromDate,
    toDate: source.toDate,
  }
  if (!isValidDateRange(range)) {
    return null
  }

  if (
    Object.hasOwn(source, 'terminalId') &&
    (typeof source.terminalId !== 'string' ||
      source.terminalId.trim().length === 0)
  ) {
    return null
  }

  return Object.freeze({
    ...range,
    ...(typeof source.terminalId === 'string'
      ? { terminalId: source.terminalId.trim() }
      : {}),
  })
}

export function getTerminalFilterState(
  filters: Pick<DynamicQrFilters, 'terminalId'>,
  lookup: TerminalLookupState,
): TerminalFilterState {
  if (!filters.terminalId) {
    return 'valid'
  }
  if (!lookup.lookupEnabled || lookup.lookupError) {
    return 'invalid'
  }
  if (lookup.lookupPending || !lookup.terminals) {
    return 'checking'
  }

  return lookup.terminals.some(
    (terminal) => terminal.id === filters.terminalId,
  )
    ? 'valid'
    : 'invalid'
}

export function presentNullableCell(value: string | null | undefined): string {
  return value && value.length > 0 ? value : '—'
}
