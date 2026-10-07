import { describe, expect, it } from 'vitest'
import { applyDynamicQrSearchQuickFilter } from '@/features/dynamic-qr/quick-filters'
import { toDynamicQrQuery } from '@/features/dynamic-qr/filters'
import { toDynamicQrExportQuery } from '@/features/dynamic-qr/export-filters'
import { applyStaticQrQuickSearch } from '@/features/static-qr/page-state'
import { applyTerminalQuickSearch } from '@/features/terminals/page-state'
import { applyBankAccountQuickSearch } from '@/features/bank-accounts/page-state'
import { applyP5QuickSearch } from '@/features/p5/page-state'
import { toStaticQrListQuery, toTerminalListQuery, toBankAccountListQuery, toCashierListQuery, type ManagementFilters } from '@/shared/contracts/management-filters'
import { toP5ListQuery } from '@/shared/contracts/p5-filters'
import { readKeys } from '@/shared/api/read-keys'

const filters = { search: 'old', page: 3, size: 25 as const, merchantId: '1', bankAccountId: '2',
  terminalId: 'T1', regionId: '3', districtId: '4', status: 0 as const, distributionStatus: 20 as const,
  fromDate: '2026-10-01', toDate: '2026-10-07' }
const scope = { source: 'live' as const, sessionScopeId: 'search-parity', accessRevision: 1 }
const domains: { name: string; apply: (current: typeof filters, search: string) => ManagementFilters;
  query: (next: ManagementFilters) => Readonly<Record<string, string>>; key: (search: string) => readonly unknown[] }[] = [
  { name: 'Dynamic QR', apply: applyDynamicQrSearchQuickFilter, query: (next) => toDynamicQrQuery({ ...filters, ...next }), key: (search: string) => readKeys.dynamicQrs(scope, { ...filters, search }) },
  { name: 'Static QR', apply: applyStaticQrQuickSearch, query: (next) => toStaticQrListQuery({ ...filters, ...next }), key: (search: string) => readKeys.staticQrs(scope, filters.terminalId, filters.page, filters.size, { ...filters, search }) },
  { name: 'Terminals', apply: applyTerminalQuickSearch, query: (next) => toTerminalListQuery({ ...filters, ...next }), key: (search: string) => readKeys.terminalList(scope, { ...filters, search }) },
  { name: 'Bank accounts', apply: applyBankAccountQuickSearch, query: (next) => toBankAccountListQuery({ ...filters, ...next }), key: (search: string) => readKeys.bankAccountList(scope, { ...filters, search }) },
  { name: 'P5', apply: applyP5QuickSearch, query: (next) => toP5ListQuery({ ...filters, ...next }), key: (search: string) => readKeys.p5List(scope, { ...filters, search }) },
]

describe.each(domains)('$name raw Search contract', ({ apply, query, key }) => {
  it.each(['  abc  ', '   ', '', '+998 (90) 123-45-67', 'AbC!'])('preserves %j with coherent first page and all existing filters', (search) => {
    const next = apply(filters, search)
    expect(next).toEqual({ ...filters, search, page: 0 })
    expect(query(next)).toMatchObject({ page: '0', size: '25' })
    if (search === '') expect(query(next)).not.toHaveProperty('search')
    else expect(query(next).search).toBe(search)
    expect(filters.page).toBe(3)
  })
  it('retains identity/page for identical text and distinguishes raw cache entries', () => {
    expect(apply(filters, filters.search)).toBe(filters)
    expect(key('abc')).not.toEqual(key('  abc  '))
    expect(key('')).not.toEqual(key('   '))
    expect(key('abc').slice(0, 3)).toEqual(['live', 'search-parity', 1])
    expect(key('abc')).toEqual(key('abc'))
  })
})

it('exports raw Search without pagination and keeps Cashier normalization unchanged', () => {
  for (const search of ['  abc  ', '   ', '']) {
    const query = toDynamicQrExportQuery({ ...filters, search })
    expect(query).not.toHaveProperty('page')
    expect(query).not.toHaveProperty('size')
    if (search) expect(query.search).toBe(search)
    else expect(query).not.toHaveProperty('search')
  }
  expect(toCashierListQuery({ ...filters, search: '  abc  ' }).search).toBe('abc')
  expect(toCashierListQuery({ ...filters, search: '   ' })).not.toHaveProperty('search')
  expect(readKeys.cashierList(scope, { ...filters, search: ' abc ' }))
    .toEqual(readKeys.cashierList(scope, { ...filters, search: 'abc' }))
})
