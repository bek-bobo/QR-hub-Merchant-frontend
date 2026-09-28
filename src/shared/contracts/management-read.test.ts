import { describe, expect, it } from 'vitest'
import { decodeTerminalPage, decodeBankAccountPage, decodeCashierPage, decodeMerchantOptions, decodeBankAccountOptions } from './management-read'
import { toTerminalListQuery, toBankAccountListQuery, toCashierListQuery, toMerchantLookupQuery, applyManagementFilters, changeMerchantDraft, dependentReadGate } from './management-filters'

const page = (row: unknown) => ({ success: true, data: { content: [row], totalElements: 1, totalPages: 1, page: 0, size: 10 } })

describe('management read boundaries', () => {
  it('keeps terminal order, duplicate IDs and nullable details without inventing QR behavior', () => {
    const row = { pkey: 'terminal-a', name: 'A', status: 7, merchantId: 2, merchantName: 'M', bankAccountId: 3, bankAccountName: 'B', terminalType: null, address: null }
    const result = decodeTerminalPage({ success: true, data: { content: [row, row], totalElements: 2, totalPages: 1, page: 0, size: 10 } })
    expect(result.content.map((item) => item.id)).toEqual(['terminal-a', 'terminal-a'])
    expect(result.content[0]).toMatchObject({ statusCode: 7, terminalType: null, address: null })
    expect(() => decodeTerminalPage(page({ ...row, merchantId: Number.MAX_SAFE_INTEGER + 1 }))).toThrow()
    expect(() => decodeTerminalPage(page({ ...row, pkey: '' }))).toThrow()
  })

  it('preserves account identifiers as exact text', () => {
    const row = { id: 4, name: 'Account', bankName: 'Bank', bankAccount: '0000123', tin: '0012', bankMfo: '00045', contractNumber: '0007', merchantId: 2, merchantName: 'M', status: 0 }
    expect(decodeBankAccountPage(page(row)).content[0]).toMatchObject({ accountNumber: '0000123', tin: '0012', mfo: '00045', contractNumber: '0007', statusCode: 0 })
    expect(() => decodeBankAccountPage(page({ ...row, bankAccount: 123 }))).toThrow()
    expect(decodeBankAccountPage(page({ ...row, contractNumber: null })).content[0]?.contractNumber).toBeNull()
  })

  it('requires cashier active-membership array and never fabricates a filtered terminal', () => {
    const row = { id: 5, fullname: 'Cashier', phone: '998901234567', status: 0, role: 'ROLE_MERCHANT_USER', terminals: [] }
    expect(decodeCashierPage(page(row)).content[0]).toMatchObject({ statusCode: 0, terminals: [] })
    expect(decodeCashierPage(page(row)).content[0]?.roleDisplay).toBe('ROLE_MERCHANT_USER')
    expect(() => decodeCashierPage(page({ ...row, terminals: null }))).toThrow()
    expect(() => decodeCashierPage(page({ ...row, id: Number.MAX_SAFE_INTEGER + 1 }))).toThrow()
  })

  it('decodes exact string lookup IDs', () => {
    expect(decodeMerchantOptions({ success: true, data: [{ id: '002', name: 'M' }] })[0]?.id).toBe('002')
    expect(decodeBankAccountOptions({ success: true, data: [{ id: '003', name: 'B' }] })[0]?.id).toBe('003')
    expect(() => decodeMerchantOptions({ success: true, data: [{ id: 2, name: 'M' }] })).toThrow()
  })
})

describe('management filters', () => {
  it('emits only each endpoint whitelist', () => {
    const extra = { status: 0, regionId: '3', sort: 'name', fromDate: 'y' }
    expect(toTerminalListQuery({ ...extra, merchantId: '2', bankAccountId: '3', search: '  A ', page: 0, size: 10 })).toEqual({ merchantId: '2', bankAccountId: '3', search: 'A', page: '0', size: '10' })
    expect(toBankAccountListQuery({ ...extra, search: ' ', page: 1, size: 25 })).toEqual({ page: '1', size: '25' })
    expect(toCashierListQuery({ ...extra, terminalId: ' terminal-a ', search: ' C ', page: 2, size: 50 })).toEqual({ terminalId: 'terminal-a', search: 'C', page: '2', size: '50' })
  })

  it('emits only a present merchant lookup parent', () => {
    expect(toMerchantLookupQuery('002')).toEqual({ merchantId: '002' })
    expect(toMerchantLookupQuery(undefined)).toEqual({})
  })

  it('clears dependent draft IDs and pauses stale applied child filters', () => {
    const changed = changeMerchantDraft({ merchantId: '1', bankAccountId: '3', terminalId: 't', search: '', page: 2, size: 10 }, '2')
    expect(changed).toMatchObject({ merchantId: '2', bankAccountId: undefined, terminalId: undefined })
    expect(applyManagementFilters({ ...changed, search: '  A  ' }).page).toBe(0)
    expect(() => applyManagementFilters({ ...changed, terminalId: 't' })).toThrow()
    expect(dependentReadGate({ appliedParentId: '1', appliedChildId: 't', lookupParentId: '2', lookupState: 'ready', optionIds: ['t'] })).toBe('pause')
    expect(dependentReadGate({ lookupState: 'denied' })).toBe('ready')
    expect(dependentReadGate({ appliedChildId: 't', lookupState: 'denied' })).toBe('pause')
  })
})
