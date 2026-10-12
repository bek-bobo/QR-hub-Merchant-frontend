import { describe, expect, it } from 'vitest'
import { decodeTerminalPage, decodeBankAccountPage, decodeCashierPage, decodeMerchantOptions, decodeBankAccountOptions } from './management-read'
import { toTerminalListQuery, toBankAccountListQuery, toCashierListQuery, toMerchantLookupQuery, applyManagementFilters, changeMerchantDraft, dependentReadGate } from './management-filters'

const page = (row: unknown) => ({ success: true, data: { content: [row], totalElements: 1, totalPages: 1, page: 0, size: 10 } })

describe('management read boundaries', () => {
  it('preserves cashier terminal order, exact IDs/names/statuses, and optional dates', () => {
    const terminals = [{ terminalId: 'ID-Case-01', terminalName: ' Terminal Z ', status: 1 },
      { terminalId: 'ID-Case-02', terminalName: 'Terminal A', status: 0 },
      { terminalId: 'ID-Case-01', terminalName: 'Duplicate', status: 777 }]
    const cashier = { id: 41, fullname: 'Cashier', phone: '998901234567', status: 0,
      role: 'User', terminals, createdAt: '2026-10-01T10:15:20', updatedAt: null }
    const decoded = decodeCashierPage(page(cashier)).content[0]
    expect(decoded).toMatchObject({ id: '41', fullname: 'Cashier', phone: cashier.phone,
      statusCode: 0, roleDisplay: 'User', createdAt: cashier.createdAt, updatedAt: null })
    expect(decoded?.terminals).toEqual(terminals.map((terminal) => ({
      id: terminal.terminalId, name: terminal.terminalName, statusCode: terminal.status,
    })))
    expect(Object.isFrozen(decoded?.terminals)).toBe(true)
    expect(decodeCashierPage(page({ ...cashier, terminals: [] })).content[0]?.terminals).toEqual([])
    expect(decodeCashierPage(page({ ...cashier, createdAt: undefined, updatedAt: 'invalid' })).content[0])
      .toMatchObject({ createdAt: null, updatedAt: null })
  })
  it('preserves confirmed terminal details and exact strings without mutating the DTO', () => {
    const row = Object.freeze({ pkey: 'T-Exact', name: ' Terminal A ', status: 0,
      merchantId: 2, merchantName: 'M', bankAccountId: 3, bankAccountName: 'B',
      terminalType: 'WEB', mccCode: '005411', regionId: 7, regionName: 'Region',
      districtId: '008', districtName: 'District', address: ' Address ',
      staticQrId: 'QR-Metadata', staticQrLink: 'https://pay.example/QR?x=%2f&Case=YES',
      phones: Object.freeze(['998901234567', '+998931234567']),
      createdAt: '2026-10-01T10:15:20', updatedAt: null })
    const decoded = decodeTerminalPage(page(row)).content[0]
    expect(decoded).toMatchObject({ id: 'T-Exact', pkey: 'T-Exact', name: ' Terminal A ',
      statusCode: 0, terminalType: 'WEB', mccCode: '005411', regionId: '7', districtId: '008',
      regionName: 'Region', districtName: 'District', address: ' Address ', staticQrId: 'QR-Metadata',
      staticQrLink: row.staticQrLink, phones: row.phones, createdAt: row.createdAt, updatedAt: null })
    expect(row.regionId).toBe(7)
    expect(decoded?.phones).not.toBe(row.phones)
    expect(Object.isFrozen(decoded?.phones)).toBe(true)
  })

  it('degrades malformed optional terminal details without rejecting valid required fields', () => {
    const row = { pkey: 'T', name: 'A', status: 0, merchantId: 2, merchantName: 'M',
      bankAccountId: 3, bankAccountName: 'B', terminalType: {}, address: [],
      regionId: Number.MAX_SAFE_INTEGER + 1, regionName: false, districtId: {}, districtName: 3,
      mccCode: {}, staticQrId: [], staticQrLink: {},
      phones: ['998901234567', null, {}, 123, '', '  '], createdAt: 'NaN', updatedAt: false }
    expect(decodeTerminalPage(page(row)).content[0]).toMatchObject({
      terminalType: null, address: null, regionId: null, regionName: null,
      districtId: null, districtName: null, mccCode: null, staticQrId: null, staticQrLink: null,
      phones: ['998901234567'], createdAt: null, updatedAt: null,
    })
    expect(decodeTerminalPage(page({ ...row, phones: null })).content[0]?.phones).toEqual([])
  })
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
    expect(toTerminalListQuery({ ...extra, merchantId: '2', bankAccountId: '3', search: '  A ', page: 0, size: 10 })).toEqual({ merchantId: '2', bankAccountId: '3', regionId: '3', search: '  A ', page: '0', size: '10' })
    expect(toBankAccountListQuery({ ...extra, search: ' ', page: 1, size: 25 })).toEqual({ search: ' ', page: '1', size: '25' })
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
