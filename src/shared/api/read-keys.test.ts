import { describe, expect, it } from 'vitest'
import type { DynamicQrFilters, ReadScope } from '@/shared/contracts/merchant-read'
import { isReadQueryKey, readKeys } from './read-keys'

const scope: ReadScope = {
  source: 'live',
  sessionScopeId: 'session-a',
  accessRevision: 3,
}

const filters: DynamicQrFilters = {
  fromDate: '2026-09-01',
  toDate: '2026-09-15',
  search: '',
  page: 0,
  size: 10,
  status: 0,
}

describe('read query keys', () => {
  it('includes all applied Static QR filters without unsupported row presentation fields', () => {
    const filters = { merchantId: '1', terminalId: 'T-Exact', regionId: '3', districtId: '4', search: 'QR', page: 0, size: 20 } as const
    const baseline = readKeys.staticQrs(scope, filters.terminalId, filters.page, filters.size, filters)
    for (const change of [{ merchantId: '5' }, { terminalId: 'T-Next' }, { regionId: '7' }, { districtId: '8' },
      { search: 'Next' }, { page: 1 }, { size: 25 }]) {
      const variant = { ...filters, ...change }
      expect(readKeys.staticQrs(scope, variant.terminalId, variant.page, variant.size, variant)).not.toEqual(baseline)
    }
    expect(readKeys.staticQrs(scope, ' T-Exact ', 0, 20, { ...filters, merchantId: ' 1 ', regionId: ' 3 ', districtId: ' 4 ', search: ' QR ' })).toEqual(baseline)
    const rowVariant = { ...filters, status: 0, fromDate: 'date', bankAccountId: '9' }
    expect(readKeys.staticQrs(scope, filters.terminalId, 0, 20, rowVariant)).toEqual(baseline)
    expect(isReadQueryKey(baseline)).toBe(true)
  })
  it('includes every effective Terminal filter and scopes district lookups by region', () => {
    const filters = { merchantId: '1', bankAccountId: '2', regionId: '3', districtId: '4', search: 'Terminal', page: 0, size: 20 } as const
    const baseline = readKeys.terminalList(scope, filters)
    for (const change of [{ merchantId: '5' }, { bankAccountId: '6' }, { regionId: '7' }, { districtId: '8' },
      { search: 'Next' }, { page: 1 }, { size: 25 as const }]) expect(readKeys.terminalList(scope, { ...filters, ...change })).not.toEqual(baseline)
    expect(readKeys.terminalList(scope, { ...filters, regionId: ' 3 ', districtId: ' 4 ' })).toEqual(baseline)
    expect(readKeys.districtLookup(scope, '3')).not.toEqual(readKeys.districtLookup(scope, '4'))
    expect(readKeys.districtLookup(scope, ' 3 ')).toEqual(readKeys.districtLookup(scope, '3'))
    for (const key of [readKeys.regionLookup(scope), readKeys.districtLookup(scope, '3')]) {
      expect(isReadQueryKey(key)).toBe(true)
      expect(key.slice(0, 3)).toEqual(readKeys.scope(scope))
    }
    expect(readKeys.regionLookup({ ...scope, accessRevision: 4 })).not.toEqual(readKeys.regionLookup(scope))
  })
  it('scopes stats by date and terminal while ignoring all list-only fields', () => {
    const baseline = readKeys.dynamicQrStats(scope, filters)
    const listVariant = { ...filters, merchantId: '1', bankAccountId: '2', distributionStatus: 20 as const,
      search: 'abc', status: 25 as const, page: 3, size: 25 as const }
    expect(readKeys.dynamicQrStats(scope, listVariant)).toEqual(baseline)
    expect(isReadQueryKey(baseline)).toBe(true)
    for (const change of [{ fromDate: '2026-09-02' }, { toDate: '2026-09-16' }, { terminalId: 'T-01' }]) {
      expect(readKeys.dynamicQrStats(scope, { ...filters, ...change })).not.toEqual(baseline)
    }
    for (const change of [{ source: 'demo' as const }, { sessionScopeId: 'b' }, { accessRevision: 4 }]) {
      expect(readKeys.dynamicQrStats({ ...scope, ...change }, filters)).not.toEqual(baseline)
    }
    expect(readKeys.dynamicQrStats(scope, { ...filters, terminalId: ' T-01 ' })).toEqual(readKeys.dynamicQrStats(scope, { ...filters, terminalId: 'T-01' }))
  })
  it('separates source, session, and permission revisions', () => {
    expect(readKeys.scope(scope)).not.toEqual(
      readKeys.scope({ ...scope, source: 'demo' }),
    )
    expect(readKeys.scope(scope)).not.toEqual(
      readKeys.scope({ ...scope, sessionScopeId: 'session-b' }),
    )
    expect(readKeys.scope(scope)).not.toEqual(
      readKeys.scope({ ...scope, accessRevision: 4 }),
    )
  })

  it('includes every API-affecting dynamic QR filter including status zero', () => {
    const baseline = readKeys.dynamicQrs(scope, filters)

    expect(baseline).not.toEqual(
      readKeys.dynamicQrs(scope, { ...filters, page: 1 }),
    )
    expect(baseline).not.toEqual(
      readKeys.dynamicQrs(scope, { ...filters, status: 5 }),
    )
    expect(baseline).not.toEqual(
      readKeys.dynamicQrs(scope, { ...filters, search: 'terminal' }),
    )
    expect(baseline).toContain(0)
    for (const change of [
      { merchantId: '1' }, { bankAccountId: '2' }, { distributionStatus: 0 as const },
      { terminalId: 't' }, { fromDate: '2026-09-02' }, { toDate: '2026-09-16' }, { size: 20 as const },
    ]) expect(readKeys.dynamicQrs(scope, { ...filters, ...change })).not.toEqual(baseline)
    expect(readKeys.dynamicQrs(scope, { ...filters, merchantId: ' 1 ', bankAccountId: ' 2 ' }))
      .toEqual(readKeys.dynamicQrs(scope, { ...filters, merchantId: '1', bankAccountId: '2' }))
  })

  it('keeps static pages and create limit lookup inside scoped cleanup', () => {
    expect(isReadQueryKey(readKeys.staticQrs(scope, 'terminal-a', 1, 25))).toBe(true)
    expect(isReadQueryKey([...readKeys.terminals(scope), 'create-limits'])).toBe(true)
    expect(isReadQueryKey(readKeys.currencies(scope))).toBe(true)
    expect(readKeys.staticQrs(scope, 'terminal-a', 1, 25)).not.toEqual(
      readKeys.staticQrs({ ...scope, accessRevision: 4 }, 'terminal-a', 1, 25),
    )
  })
  it('separates management filters and parent-scoped lookups while preserving the legacy terminal key', () => {
    const base = { search: '', page: 0, size: 10 } as const
    expect(readKeys.terminalList(scope, base)).not.toEqual(readKeys.terminalList(scope, { ...base, bankAccountId: '2' }))
    expect(readKeys.cashierList(scope, base)).not.toEqual(readKeys.cashierList(scope, { ...base, terminalId: 't' }))
    expect(readKeys.bankAccountLookup(scope, '1')).not.toEqual(readKeys.bankAccountLookup(scope, '2'))
    expect(readKeys.terminalsForMerchant(scope)).toEqual(readKeys.terminals(scope))
    expect(readKeys.terminalsForMerchant(scope, '2')).not.toEqual(readKeys.terminals(scope))
    expect(isReadQueryKey(readKeys.merchantLookup(scope))).toBe(true)
  })
  it('retains Bank Account merchant, search, page and size in list identity', () => {
    const filters = { merchantId: '2', search: 'Bank', page: 0, size: 20 } as const
    const baseline = readKeys.bankAccountList(scope, filters)
    expect(baseline).not.toEqual(readKeys.bankAccountList(scope, { ...filters, search: 'Account' }))
    expect(baseline).not.toEqual(readKeys.bankAccountList(scope, { ...filters, merchantId: '3' }))
    expect(baseline).not.toEqual(readKeys.bankAccountList(scope, { ...filters, page: 1 }))
    expect(baseline).not.toEqual(readKeys.bankAccountList(scope, { ...filters, size: 10 }))
    expect(baseline).toEqual(readKeys.bankAccountList(scope, { ...filters, search: ' Bank ' }))
  })
  it('retains Cashier merchant, terminal, search, page and size in list identity', () => {
    const filters = { merchantId: '2', terminalId: 't1', search: 'Cashier', page: 0, size: 20 } as const
    const baseline = readKeys.cashierList(scope, filters)
    for (const change of [{ merchantId: '3' }, { terminalId: 't2' }, { search: 'Phone' }, { page: 1 }, { size: 10 as const }]) {
      expect(readKeys.cashierList(scope, { ...filters, ...change })).not.toEqual(baseline)
    }
    expect(readKeys.cashierList(scope, { ...filters, search: ' Cashier ' })).toEqual(baseline)
  })
  it('includes every P5 API-affecting filter and stays inside scoped cleanup', () => {
    const filters = { merchantId: '2', terminalId: 'terminal-a', status: 0, search: ' device ', page: 1, size: 25 } as const
    const baseline = readKeys.p5List(scope, filters)
    expect(baseline).not.toEqual(readKeys.p5List(scope, { ...filters, terminalId: 'terminal-b' }))
    expect(baseline).not.toEqual(readKeys.p5List(scope, { ...filters, status: 1 }))
    expect(baseline).not.toEqual(readKeys.p5List(scope, { ...filters, status: 777 }))
    expect(baseline).not.toEqual(readKeys.p5List(scope, { ...filters, merchantId: '3' }))
    expect(baseline).not.toEqual(readKeys.p5List(scope, { ...filters, search: 'another-device' }))
    expect(baseline).not.toEqual(readKeys.p5List(scope, { ...filters, size: 20 }))
    expect(baseline).not.toEqual(readKeys.p5List(scope, { ...filters, page: 2 }))
    expect(baseline).toContain(0)
    expect(isReadQueryKey(baseline)).toBe(true)
  })
})
