import { describe, expect, it } from 'vitest'
import { applyTerminalDraft, createDefaultTerminalFilters, terminalParentState } from './page-state'
import { changeManagementPage, changeManagementSize, clearManagementFilters, changeMerchantDraft, toTerminalListQuery } from '@/shared/contracts/management-filters'

describe('terminal filter state', () => {
  it('applies the exact wire subset and resets page without client filtering', () => {
    const initial = createDefaultTerminalFilters()
    const draft = { ...initial, merchantId: '2', bankAccountId: '3', search: '  Terminal A ', page: 4 }
    const applied = applyTerminalDraft(draft, { merchantIds: ['2'], bank: { lookupParentId: '2', lookupState: 'ready', optionIds: ['3'] } })
    expect(toTerminalListQuery(applied)).toEqual({ merchantId: '2', bankAccountId: '3', search: 'Terminal A', page: '0', size: '10' })
    expect(changeManagementPage(applied, 2).page).toBe(2)
    expect(changeManagementSize(applied, 25)).toMatchObject({ page: 0, size: 25 })
    expect(clearManagementFilters(applied)).toMatchObject({ merchantId: undefined, bankAccountId: undefined, search: '', page: 0, size: 10 })
  })

  it('clears dependent draft and refuses a stale wrong-parent bank option', () => {
    const draft = changeMerchantDraft({ ...createDefaultTerminalFilters(), merchantId: '1', bankAccountId: '3' }, '2')
    expect(draft.bankAccountId).toBeUndefined()
    expect(() => applyTerminalDraft({ ...draft, bankAccountId: '3' }, { merchantIds: ['2'], bank: { lookupParentId: '1', lookupState: 'ready', optionIds: ['3'] } })).toThrow()
  })

  it('keeps unfiltered reads usable when optional merchant lookup is denied, but pauses an applied parent', () => {
    expect(terminalParentState(undefined, { kind: 'denied' })).toBe('ready')
    expect(terminalParentState('2', { kind: 'denied' })).toBe('pause')
    expect(terminalParentState('2', { kind: 'ready', ids: ['2'] })).toBe('ready')
    expect(terminalParentState('2', { kind: 'ready', ids: ['1'] })).toBe('pause')
  })
})
