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
  it('includes every P5 API-affecting filter and stays inside scoped cleanup', () => {
    const filters = { merchantId: '2', terminalId: 'terminal-a', status: 0, search: ' device ', page: 1, size: 25 } as const
    const baseline = readKeys.p5List(scope, filters)
    expect(baseline).not.toEqual(readKeys.p5List(scope, { ...filters, terminalId: 'terminal-b' }))
    expect(baseline).not.toEqual(readKeys.p5List(scope, { ...filters, status: 1 }))
    expect(baseline).not.toEqual(readKeys.p5List(scope, { ...filters, page: 2 }))
    expect(baseline).toContain(0)
    expect(isReadQueryKey(baseline)).toBe(true)
  })
})
