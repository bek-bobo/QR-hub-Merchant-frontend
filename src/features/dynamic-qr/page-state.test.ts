import { describe, expect, it } from 'vitest'
import type { DynamicQrFilters, TerminalOption } from '@/shared/contracts/merchant-read'
import { presentQrStatus } from '@/shared/presentation/qr-status'
import { toDynamicQrQuery } from './filters'
import {
  createDefaultDynamicQrFilters,
  getTerminalFilterState,
  parseDashboardDynamicQrState,
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
  size: 20,
}

describe('dynamic QR page state', () => {
  it('creates the same-day Tashkent default without optional filters', () => {
    const defaults = createDefaultDynamicQrFilters(new Date('2026-09-14T20:30:00Z'))
    expect(defaults).toEqual({
      fromDate: '2026-09-15',
      toDate: '2026-09-15',
      status: undefined,
      search: '',
      page: 0,
      size: 20,
    })
    expect(toDynamicQrQuery(defaults)).toMatchObject({ page: '0', size: '20' })
    for (const field of ['merchantId', 'bankAccountId', 'terminalId', 'status', 'distributionStatus', 'search']) {
      expect(toDynamicQrQuery(defaults)).not.toHaveProperty(field)
    }
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
    expect(presentQrStatus(777).label).toBe('Noma’lum')
    expect(presentQrStatus(777).label).not.toContain('777')
  })

  it('maps all status to undefined without coercing an empty string', () => {
    expect(parseQrStatusInput('')).toBeUndefined()
    expect(parseQrStatusInput('0')).toBe(0)
    expect(parseQrStatusInput('25')).toBe(25)
    expect(() => parseQrStatusInput('777')).toThrow()
  })
})
