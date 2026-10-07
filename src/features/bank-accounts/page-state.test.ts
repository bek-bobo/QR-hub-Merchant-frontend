import { describe, expect, it } from 'vitest'
import { changeManagementPage, clearManagementFilters, toBankAccountListQuery } from '@/shared/contracts/management-filters'
import { applyBankAccountDraft, applyBankAccountMerchantDraft, applyBankAccountQuickSearch, bankAccountParentState, createDefaultBankAccountFilters } from './page-state'

describe('bank-account filter state', () => {
  it('applies only merchant/search/page/size and resets page', () => {
    const draft = { ...createDefaultBankAccountFilters(), merchantId: '2', search: '  0001 ', page: 4 }
    const applied = applyBankAccountDraft(draft, ['2'])
    expect(toBankAccountListQuery(applied)).toEqual({ merchantId: '2', search: '  0001 ', page: '0', size: '20' })
    expect(changeManagementPage(applied, 2).page).toBe(2)
    expect(clearManagementFilters(applied)).toMatchObject({ merchantId: undefined, search: '', page: 0, size: 20 })
  })

  it('pauses an unconfirmed applied merchant but permits unfiltered read without lookup', () => {
    expect(bankAccountParentState(undefined, { kind: 'denied' })).toBe('ready')
    expect(bankAccountParentState('2', { kind: 'denied' })).toBe('pause')
    expect(bankAccountParentState('2', { kind: 'error' })).toBe('pause')
    expect(bankAccountParentState('2', { kind: 'loading' })).toBe('pause')
    expect(bankAccountParentState('2', { kind: 'ready', ids: ['1'] })).toBe('pause')
    expect(bankAccountParentState('2', { kind: 'ready', ids: ['2'] })).toBe('ready')
    expect(() => applyBankAccountDraft({ ...createDefaultBankAccountFilters(), merchantId: '2' })).toThrow()
  })

  it('applies and clears search while preserving the applied merchant and fixed size', () => {
    const current = { ...createDefaultBankAccountFilters(), merchantId: '2', page: 4 }
    const next = applyBankAccountQuickSearch(current, '  Bank  ')
    expect(next).toEqual({ ...current, search: '  Bank  ', page: 0 })
    expect(toBankAccountListQuery(next)).toEqual({ merchantId: '2', search: '  Bank  ', page: '0', size: '20' })
    expect(toBankAccountListQuery(applyBankAccountQuickSearch(next, '  ')))
      .toEqual({ merchantId: '2', search: '  ', page: '0', size: '20' })
    expect(current.page).toBe(4)
  })

  it('avoids repeated identical search updates and retains the existing page', () => {
    const current = { ...createDefaultBankAccountFilters(), search: 'Bank' }
    expect(applyBankAccountQuickSearch(current, 'Bank')).toBe(current)
    expect(applyBankAccountQuickSearch({ ...current, page: 2 }, 'Bank').page).toBe(2)
  })

  it('applies merchant only while preserving the applied quick search', () => {
    const current = { ...createDefaultBankAccountFilters(), merchantId: '2', search: 'account', page: 4 }
    const next = applyBankAccountMerchantDraft(current, { merchantId: '3' }, ['2', '3'])
    expect(next).toEqual({ ...current, merchantId: '3', page: 0 })
    expect(current).toMatchObject({ merchantId: '2', search: 'account', page: 4 })
    expect(applyBankAccountMerchantDraft(current, {})).toMatchObject({ merchantId: undefined, search: 'account', page: 0 })
    expect(() => applyBankAccountMerchantDraft(current, { merchantId: 'missing' }, ['2'])).toThrow()
    expect(() => applyBankAccountMerchantDraft(current, { merchantId: '3' })).toThrow()
    expect(current.page).toBe(4)
  })

  it('resets merchant and quick search together without changing size', () => {
    const current = { ...createDefaultBankAccountFilters(), merchantId: '2', search: 'Bank', page: 3 }
    expect(toBankAccountListQuery(clearManagementFilters(current))).toEqual({ page: '0', size: '20' })
  })
})
