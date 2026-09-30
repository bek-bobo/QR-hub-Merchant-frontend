import { describe, expect, it } from 'vitest'
import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import {
  applyDynamicQrAdvancedFilters,
  applyDynamicQrDateQuickFilter,
  applyDynamicQrSearchQuickFilter,
  restoreDefaultDynamicQrDateRange,
} from './quick-filters'

const applied: DynamicQrFilters = {
  fromDate: '2026-09-01',
  toDate: '2026-09-07',
  terminalId: 'terminal-a',
  status: 50,
  search: 'old search',
  page: 3,
  size: 20,
}

describe('dynamic QR quick filters', () => {
  it('applies a complete range without applying unrelated advanced drafts', () => {
    expect(applyDynamicQrDateQuickFilter(applied, {
      fromDate: '2026-09-08',
      toDate: '2026-09-30',
    })).toEqual({
      ...applied,
      fromDate: '2026-09-08',
      toDate: '2026-09-30',
      page: 0,
    })
  })

  it('does not apply an incomplete or invalid range', () => {
    expect(applyDynamicQrDateQuickFilter(applied, {
      fromDate: '2026-09-08',
      toDate: '',
    })).toBeNull()
    expect(applyDynamicQrDateQuickFilter(applied, {
      fromDate: '2026-09-30',
      toDate: '2026-09-08',
    })).toBeNull()
  })

  it('restores the valid default range without clearing other applied filters', () => {
    expect(restoreDefaultDynamicQrDateRange(
      applied,
      new Date('2026-09-30T08:00:00Z'),
    )).toEqual({
      ...applied,
      fromDate: '2026-09-24',
      toDate: '2026-09-30',
      page: 0,
    })
  })

  it('applies and clears search without applying unrelated advanced drafts', () => {
    expect(applyDynamicQrSearchQuickFilter(applied, '  Terminal B  ')).toEqual({
      ...applied,
      search: 'Terminal B',
      page: 0,
    })
    expect(applyDynamicQrSearchQuickFilter(applied, '')).toEqual({
      ...applied,
      search: '',
      page: 0,
    })
  })

  it('applies advanced filters without replacing applied date or search values', () => {
    expect(applyDynamicQrAdvancedFilters(applied, {
      terminalId: ' terminal-b ',
      status: 0,
    })).toEqual({
      ...applied,
      terminalId: 'terminal-b',
      status: 0,
      page: 0,
    })
  })
})
