import { describe, expect, it } from 'vitest'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'
import { changeManagementPage, changeMerchantDraft, clearManagementFilters, toCashierListQuery } from '@/shared/contracts/management-filters'
import { applyCashierDraft, cashierParentState, cashierSelectionKey, createCashierTarget, createDefaultCashierFilters, resolveCashierTarget } from './page-state'

const scope: ReadScope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const cashier: CashierRow = { createdAt: null, updatedAt: null, id: '11', fullname: 'Cashier A', phone: '+998900000001', statusCode: 777, roleDisplay: 'Merchant user', terminals: [] }

describe('cashier filter state', () => {
  it('serializes only the supported server subset and resets page on apply and clear', () => {
    const applied = applyCashierDraft({ ...createDefaultCashierFilters(), merchantId: '2', terminalId: 'term-3', search: '  Cashier A ', page: 4 }, {
      merchantIds: ['2'], terminal: { lookupParentId: '2', lookupState: 'ready', optionIds: ['term-3'] },
    })
    expect(toCashierListQuery(applied)).toEqual({ merchantId: '2', terminalId: 'term-3', search: 'Cashier A', page: '0', size: '20' })
    expect(changeManagementPage(applied, 2).page).toBe(2)
    expect(clearManagementFilters(applied)).toMatchObject({ merchantId: undefined, terminalId: undefined, search: '', page: 0, size: 20 })
  })

  it('clears the dependent terminal draft and rejects wrong-parent delayed options', () => {
    const changed = changeMerchantDraft({ ...createDefaultCashierFilters(), merchantId: '1', terminalId: 'term-3' }, '2')
    expect(changed.terminalId).toBeUndefined()
    expect(() => applyCashierDraft({ ...changed, terminalId: 'term-3' }, {
      merchantIds: ['2'], terminal: { lookupParentId: '1', lookupState: 'ready', optionIds: ['term-3'] },
    })).toThrow()
  })

  it('keeps an unfiltered read usable without merchant lookup and pauses an unconfirmed parent', () => {
    expect(cashierParentState(undefined, { kind: 'denied' })).toBe('ready')
    expect(cashierParentState('2', { kind: 'error' })).toBe('pause')
    expect(cashierParentState('2', { kind: 'ready', ids: ['1'] })).toBe('pause')
    expect(cashierParentState('2', { kind: 'ready', ids: ['2'] })).toBe('ready')
  })
})

describe('selected cashier target', () => {
  it('replaces selection ownership for scope, filter, page or visible-row identity changes', () => {
    const page: Page<CashierRow> = { content: [cashier], totalElements: 1, totalPages: 1, page: 0, size: 10 }
    const key = cashierSelectionKey(['read', 'live', 'session-a', 1, 'cashier-list', null, null, '', 0, 10], page)
    expect(cashierSelectionKey(['read', 'demo', 'session-a', 1, 'cashier-list', null, null, '', 0, 10], page)).not.toBe(key)
    expect(cashierSelectionKey(['read', 'live', 'session-b', 1, 'cashier-list', null, null, '', 0, 10], page)).not.toBe(key)
    expect(cashierSelectionKey(['read', 'live', 'session-a', 2, 'cashier-list', null, null, '', 0, 10], page)).not.toBe(key)
    expect(cashierSelectionKey(['read', 'live', 'session-a', 1, 'cashier-list', null, null, 'other', 0, 10], page)).not.toBe(key)
    expect(cashierSelectionKey(['read', 'live', 'session-a', 1, 'cashier-list', null, null, '', 1, 10], { ...page, page: 1 })).not.toBe(key)
    const absentKey = cashierSelectionKey(['read', 'live', 'session-a', 1, 'cashier-list', null, null, '', 0, 10], { ...page, content: [] })
    expect(absentKey).not.toBe(key)
    expect(cashierSelectionKey(['read', 'live', 'session-a', 1, 'cashier-list', null, null, '', 0, 10], page)).toBe(key)
    expect(cashierSelectionKey(['read', 'live', 'session-a', 1, 'cashier-list', null, null, '', 0, 10], { ...page, content: [{ ...cashier, id: '12' }] })).not.toBe(key)
    expect(key).not.toContain(cashier.phone)
  })

  it('binds selection to exact scope and a currently visible cashier row', () => {
    const target = createCashierTarget(cashier, scope)
    expect(resolveCashierTarget(target, scope, [cashier], true)).toEqual(cashier)
    expect(resolveCashierTarget(target, { ...scope, source: 'demo' }, [cashier], true)).toBeNull()
    expect(resolveCashierTarget(target, { ...scope, sessionScopeId: 'session-b' }, [cashier], true)).toBeNull()
    expect(resolveCashierTarget(target, { ...scope, accessRevision: 2 }, [cashier], true)).toBeNull()
    expect(resolveCashierTarget(target, scope, [{ ...cashier, id: '12' }], true)).toBeNull()
    expect(resolveCashierTarget(target, scope, [], true)).toBeNull()
    expect(resolveCashierTarget(target, scope, [cashier], false)).toBeNull()
  })

  it('resolves a switched target to the new cashier only', () => {
    const other = { ...cashier, id: '12', fullname: 'Cashier B', phone: '+998900000002' }
    expect(resolveCashierTarget(createCashierTarget(other, scope), scope, [cashier, other], true)).toEqual(other)
  })
})
