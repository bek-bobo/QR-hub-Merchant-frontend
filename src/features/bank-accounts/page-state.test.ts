import { describe, expect, it } from 'vitest'
import { changeManagementPage, changeManagementSize, clearManagementFilters, toBankAccountListQuery } from '@/shared/contracts/management-filters'
import { applyBankAccountDraft, bankAccountParentState, createDefaultBankAccountFilters } from './page-state'

describe('bank-account filter state', () => {
  it('applies only merchant/search/page/size and resets page', () => {
    const draft = { ...createDefaultBankAccountFilters(), merchantId: '2', search: '  0001 ', page: 4 }
    const applied = applyBankAccountDraft(draft, ['2'])
    expect(toBankAccountListQuery(applied)).toEqual({ merchantId: '2', search: '0001', page: '0', size: '10' })
    expect(changeManagementPage(applied, 2).page).toBe(2)
    expect(changeManagementSize(applied, 25)).toMatchObject({ page: 0, size: 25 })
    expect(clearManagementFilters(applied)).toMatchObject({ merchantId: undefined, search: '', page: 0, size: 10 })
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
})
