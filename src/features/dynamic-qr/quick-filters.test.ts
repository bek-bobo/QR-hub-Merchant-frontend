import { describe, expect, it } from 'vitest'
import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import {
  applyDynamicQrAdvancedFilters,
  applyDynamicQrDateQuickFilter,
  applyDynamicQrSearchQuickFilter,
  restoreDefaultDynamicQrDateRange,
  changeDynamicQrMerchantDraft,
  getDynamicQrStructuredState,
  reconcileDynamicQrLookupDraft,
  type DynamicQrStructuredLookups,
} from './quick-filters'
import { toDynamicQrQuery } from './filters'

const applied: DynamicQrFilters = {
  fromDate: '2026-09-01',
  toDate: '2026-09-07',
  terminalId: 'terminal-a',
  status: 50,
  merchantId: '1',
  bankAccountId: '2',
  distributionStatus: 20,
  search: 'old search',
  page: 3,
  size: 20,
}

const lookups: DynamicQrStructuredLookups = {
  merchants: { enabled: true, pending: false, error: false, ids: ['1'] },
  banks: { enabled: true, pending: false, error: false, ids: ['2'], merchantId: '1' },
  terminals: { enabled: true, pending: false, error: false, ids: ['terminal-a', 'terminal-b'], merchantId: '1' },
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
      merchantId: ' 1 ', bankAccountId: ' 2 ', distributionStatus: 20,
      terminalId: ' terminal-b ',
      status: 0,
    }, lookups)).toEqual({
      ...applied,
      terminalId: 'terminal-b',
      status: 0,
      page: 0,
    })
  })
  it('clears dependent drafts on merchant change without changing applied filters', () => {
    const draft = changeDynamicQrMerchantDraft(applied, '3')
    expect(draft).toMatchObject({ merchantId: '3', bankAccountId: undefined, terminalId: undefined })
    expect(applied).toMatchObject({ merchantId: '1', bankAccountId: '2', terminalId: 'terminal-a' })
  })
  it.each(['merchants', 'banks', 'terminals'] as const)('rejects failed %s lookup and retains the applied snapshot', (name) => {
    const failed = { ...lookups, [name]: { ...lookups[name], error: true } }
    expect(() => applyDynamicQrAdvancedFilters(applied, applied, failed)).toThrow()
    expect(applied.page).toBe(3)
    expect(getDynamicQrStructuredState({}, failed)).toBe('valid')
  })
  it('rejects mismatched parents and waits for selected lookup values', () => {
    expect(getDynamicQrStructuredState(applied, { ...lookups, banks: { ...lookups.banks, merchantId: '3' } })).toBe('invalid')
    expect(getDynamicQrStructuredState(applied, { ...lookups, banks: { ...lookups.banks, pending: true } })).toBe('checking')
    expect(getDynamicQrStructuredState(applied, { ...lookups, banks: { ...lookups.banks, ids: [] } })).toBe('invalid')
  })

  it('clears a stale bank draft after a successful empty response without mutating applied filters', () => {
    const evidence = { ...lookups, banks: { ...lookups.banks, ids: [] } }
    const draft = reconcileDynamicQrLookupDraft(applied, evidence)
    expect(draft.bankAccountId).toBeUndefined()
    expect(applied.bankAccountId).toBe('2')
    expect(applied.page).toBe(3)
    const query = toDynamicQrQuery(applyDynamicQrAdvancedFilters(applied, draft, evidence))
    expect(query).not.toHaveProperty('bankAccountId')
    expect(query.merchantId).toBe('1')
  })

  it('clears missing merchant and dependent drafts after a confirmed refresh', () => {
    const evidence = { ...lookups, merchants: { ...lookups.merchants, ids: [] } }
    const draft = reconcileDynamicQrLookupDraft(applied, evidence)
    expect(draft).toMatchObject({ merchantId: undefined, bankAccountId: undefined, terminalId: undefined })
    const query = toDynamicQrQuery(applyDynamicQrAdvancedFilters(applied, draft, evidence))
    expect(query).not.toHaveProperty('merchantId')
    expect(query).not.toHaveProperty('bankAccountId')
    expect(applied.merchantId).toBe('1')
  })

  it('clears a missing bank after a non-empty refresh but preserves valid selections', () => {
    expect(reconcileDynamicQrLookupDraft(applied, lookups)).toBe(applied)
    expect(toDynamicQrQuery(applyDynamicQrAdvancedFilters(applied, applied, lookups)))
      .toMatchObject({ merchantId: '1', bankAccountId: '2' })
    expect(reconcileDynamicQrLookupDraft(applied, { ...lookups, banks: { ...lookups.banks, ids: ['3'] } }).bankAccountId).toBeUndefined()
  })

  it('does not clear drafts against failures, pending requests or another parent', () => {
    for (const bank of [
      { ...lookups.banks, error: true, ids: [] },
      { ...lookups.banks, pending: true, ids: [] },
      { ...lookups.banks, enabled: false, ids: [] },
      { ...lookups.banks, merchantId: '3', ids: [] },
    ]) expect(reconcileDynamicQrLookupDraft(applied, { ...lookups, banks: bank })).toBe(applied)
  })
})
