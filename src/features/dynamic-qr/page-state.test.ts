import { describe, expect, it } from 'vitest'
import type { DynamicQrFilters, TerminalOption } from '@/shared/contracts/merchant-read'
import { presentQrStatus } from '@/features/dashboard/presenters'
import {
  changeDynamicQrPageSize,
  createDefaultDynamicQrFilters,
  getPaginationState,
  getTerminalFilterState,
  parseDashboardDynamicQrState,
  parsePageSizeInput,
  parseQrStatusInput,
  presentNullableCell,
} from './page-state'

const filters: DynamicQrFilters = {
  fromDate: '2026-09-09',
  toDate: '2026-09-15',
  terminalId: 'terminal-a',
  status: 0,
  search: 'qr',
  page: 4,
  size: 10,
}

describe('dynamic QR page state', () => {
  it('creates the seven-day Tashkent default without optional filters', () => {
    expect(
      createDefaultDynamicQrFilters(new Date('2026-09-14T20:30:00Z')),
    ).toEqual({
      fromDate: '2026-09-09',
      toDate: '2026-09-15',
      status: undefined,
      search: '',
      page: 0,
      size: 10,
    })
  })

  it.each([10, 25, 50] as const)(
    'accepts size %i and resets the backend page to zero',
    (size) => {
      expect(changeDynamicQrPageSize(filters, size)).toMatchObject({
        page: 0,
        size,
        terminalId: 'terminal-a',
        status: 0,
      })
    },
  )

  it('accepts only supported page-size values', () => {
    expect(parsePageSizeInput('10')).toBe(10)
    expect(parsePageSizeInput('25')).toBe(25)
    expect(parsePageSizeInput('50')).toBe(50)
    expect(() => parsePageSizeInput('100')).toThrow()
  })

  it('uses one-based UI pages and backend response boundaries', () => {
    expect(
      getPaginationState({
        totalPages: 4,
        page: 0,
      }),
    ).toEqual({ uiPage: 1, previousDisabled: true, nextDisabled: false })
    expect(
      getPaginationState({
        totalPages: 4,
        page: 3,
      }),
    ).toEqual({ uiPage: 4, previousDisabled: false, nextDisabled: true })
  })

  it('revalidates dashboard router state and ignores extra filters', () => {
    expect(
      parseDashboardDynamicQrState({
        fromDate: '2026-09-09',
        toDate: '2026-09-15',
        terminalId: 'terminal-a',
        status: 50,
        search: 'ignored',
        page: 8,
        size: 50,
      }),
    ).toEqual({
      fromDate: '2026-09-09',
      toDate: '2026-09-15',
      terminalId: 'terminal-a',
    })
    expect(
      parseDashboardDynamicQrState({
        fromDate: '2026-02-30',
        toDate: '2026-03-01',
      }),
    ).toBeNull()
  })

  it('does not silently widen an applied terminal filter', () => {
    const terminals: readonly TerminalOption[] = [
      { id: 'terminal-b', name: 'Terminal B' },
    ]
    expect(
      getTerminalFilterState(filters, {
        lookupEnabled: true,
        lookupPending: false,
        lookupError: false,
        terminals,
      }),
    ).toBe('invalid')
    expect(filters.terminalId).toBe('terminal-a')
  })

  it('uses fallbacks for nullable cells and neutral unknown statuses', () => {
    expect(presentNullableCell(null)).toBe('—')
    expect(presentNullableCell('Merchant A')).toBe('Merchant A')
    expect(presentQrStatus(25).label).toBe('Rad etilgan')
    expect(presentQrStatus(777).label).toBe('Noma’lum (777)')
  })

  it('maps all status to undefined without coercing an empty string', () => {
    expect(parseQrStatusInput('')).toBeUndefined()
    expect(parseQrStatusInput('0')).toBe(0)
    expect(() => parseQrStatusInput('25')).toThrow()
  })
})
