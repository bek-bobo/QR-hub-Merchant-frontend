import { describe, expect, it } from 'vitest'
import { applyTerminalDraft, applyTerminalAdvancedDraft, applyTerminalQuickSearch, changeTerminalMerchantDraft, changeTerminalRegionDraft,
  reconcileTerminalAdvancedDraft, resetTerminalFilters, createDefaultTerminalFilters, terminalParentState } from './page-state'
import { changeManagementPage, clearManagementFilters, changeMerchantDraft, toTerminalListQuery } from '@/shared/contracts/management-filters'

describe('terminal filter state', () => {
  const applied = { ...createDefaultTerminalFilters(), merchantId: '1', bankAccountId: '2', regionId: '3', districtId: '4', search: 'old', page: 5 }
  const valid = { merchantIds: ['1'], regionIds: ['3'],
    bank: { lookupParentId: '1', lookupState: 'ready' as const, optionIds: ['2'] },
    district: { lookupParentId: '3', lookupState: 'ready' as const, optionIds: ['4'] } }

  it('applies all four structured filters while retaining applied quick search and fixed size', () => {
    const next = applyTerminalAdvancedDraft({ ...applied, search: 'kept' }, applied, valid)
    expect(toTerminalListQuery(next)).toEqual({ merchantId: '1', bankAccountId: '2', regionId: '3', districtId: '4', search: 'kept', page: '0', size: '20' })
    expect(applied.page).toBe(5)
  })

  it('trims quick search and immediately clears it without changing structured filters', () => {
    const next = applyTerminalQuickSearch(applied, '  Terminal A  ')
    expect(next).toEqual({ ...applied, search: 'Terminal A', page: 0 })
    expect(applyTerminalQuickSearch(next, ' Terminal A ')).toBe(next)
    expect(applyTerminalQuickSearch(next, '')).toEqual({ ...applied, search: '', page: 0 })
  })

  it('changes only draft dependencies and resets all fields with the current size', () => {
    expect(changeTerminalMerchantDraft(applied, '5')).toMatchObject({ merchantId: '5', bankAccountId: undefined, regionId: '3', districtId: '4' })
    expect(changeTerminalRegionDraft(applied, '6')).toMatchObject({ merchantId: '1', bankAccountId: '2', regionId: '6', districtId: undefined })
    expect(applied).toMatchObject({ merchantId: '1', bankAccountId: '2', regionId: '3', districtId: '4', page: 5 })
    expect(resetTerminalFilters({ ...applied, size: 25 })).toEqual({ search: '', page: 0, size: 25 })
  })

  it('reconciles successful empty draft domains without mutating applied state or serializing stale IDs', () => {
    const draft = reconcileTerminalAdvancedDraft(applied, { merchant: { kind: 'ready', ids: ['1'] },
      region: { kind: 'ready', ids: ['3'] }, bank: { ...valid.bank, optionIds: [] }, district: { ...valid.district, optionIds: [] } })
    expect(draft).toMatchObject({ bankAccountId: undefined, districtId: undefined })
    expect(toTerminalListQuery(applyTerminalAdvancedDraft(applied, draft, valid))).toEqual({ merchantId: '1', regionId: '3', search: 'old', page: '0', size: '20' })
    expect(applied).toMatchObject({ bankAccountId: '2', districtId: '4', page: 5 })
  })

  it.each(['loading', 'error', 'unavailable'] as const)('preserves selections during %s and refuses unconfirmed Apply', (lookupState) => {
    const evidence = { merchant: { kind: 'ready' as const, ids: ['1'] }, region: { kind: 'ready' as const, ids: ['3'] },
      bank: { ...valid.bank, lookupState }, district: { ...valid.district, lookupState } }
    expect(reconcileTerminalAdvancedDraft(applied, evidence)).toBe(applied)
    expect(() => applyTerminalAdvancedDraft(applied, applied, { ...valid, bank: evidence.bank })).toThrow()
    expect(() => applyTerminalAdvancedDraft(applied, applied, { ...valid, district: evidence.district })).toThrow()
    expect(applied.page).toBe(5)
  })

  it('rejects unknown parents, wrong-region districts, and districts without a region', () => {
    expect(() => applyTerminalDraft(applied, { ...valid, merchantIds: [] })).toThrow()
    expect(() => applyTerminalDraft(applied, { ...valid, regionIds: [] })).toThrow()
    expect(() => applyTerminalDraft(applied, { ...valid, district: { ...valid.district, lookupParentId: '9' } })).toThrow()
    expect(() => applyTerminalDraft({ ...applied, regionId: undefined }, valid)).toThrow()
    expect(() => applyTerminalDraft(applied, { ...valid, district: { ...valid.district, optionIds: [] } })).toThrow()
  })

  it('serializes only supported parameters, omits whitespace optionals, and rejects unsafe numeric IDs', () => {
    expect(toTerminalListQuery({ ...createDefaultTerminalFilters(), merchantId: ' ', bankAccountId: '', regionId: ' ', districtId: '', search: ' ' }))
      .toEqual({ page: '0', size: '20' })
    expect(toTerminalListQuery({ ...applied, merchantId: ' 1 ', bankAccountId: ' 2 ', regionId: ' 3 ', districtId: ' 4 ', search: ' old ' }))
      .toEqual({ merchantId: '1', bankAccountId: '2', regionId: '3', districtId: '4', search: 'old', page: '5', size: '20' })
    for (const id of ['x', '-1', '1.1', '9007199254740992']) {
      expect(() => toTerminalListQuery({ ...applied, regionId: id })).toThrow()
      expect(() => toTerminalListQuery({ ...applied, districtId: id })).toThrow()
    }
  })
  it('applies the exact wire subset and resets page without client filtering', () => {
    const initial = createDefaultTerminalFilters()
    const draft = { ...initial, merchantId: '2', bankAccountId: '3', search: '  Terminal A ', page: 4 }
    const applied = applyTerminalDraft(draft, { merchantIds: ['2'], bank: { lookupParentId: '2', lookupState: 'ready', optionIds: ['3'] } })
    expect(toTerminalListQuery(applied)).toEqual({ merchantId: '2', bankAccountId: '3', search: 'Terminal A', page: '0', size: '20' })
    expect(changeManagementPage(applied, 2).page).toBe(2)
    expect(clearManagementFilters(applied)).toMatchObject({ merchantId: undefined, bankAccountId: undefined, search: '', page: 0, size: 20 })
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
