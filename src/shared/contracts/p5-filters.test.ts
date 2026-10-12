import { describe, expect, it } from 'vitest'
import {
  applyP5Filters,
  changeP5MerchantDraft,
  changeP5Page,
  clearP5Filters,
  toP5ListQuery,
} from './p5-filters'

const base = { search: '', page: 0, size: 20 } as const

describe('P5 filters', () => {
  it('emits only the endpoint whitelist and preserves status zero', () => {
    const query = toP5ListQuery({
      ...base,
      merchantId: '002',
      terminalId: ' terminal-a ',
      status: 0,
      search: '  Device ',
      sort: 'name',
      fromDate: '2026-09-01',
    } as never)
    expect(query).toEqual({
      merchantId: '002', terminalId: 'terminal-a', status: '0', search: '  Device ', page: '0', size: '20',
    })
  })

  it('omits blank optional filters and rejects values outside backend integer contracts', () => {
    expect(toP5ListQuery({ ...base, merchantId: ' ', terminalId: ' ', search: ' ' })).toEqual({ search: ' ', page: '0', size: '20' })
    expect(() => toP5ListQuery({ ...base, status: 2_147_483_648 })).toThrow()
    expect(() => toP5ListQuery({ ...base, merchantId: '2.5' })).toThrow()
  })

  it('clears a dependent terminal draft when the merchant changes', () => {
    expect(changeP5MerchantDraft({ ...base, merchantId: '1', terminalId: 'terminal-a' }, '2'))
      .toMatchObject({ merchantId: '2', terminalId: undefined })
  })

  it('requires a scoped lookup to confirm an applied terminal and resets the page on apply', () => {
    const draft = { ...base, merchantId: '2', terminalId: 'terminal-a', search: '  A  ', page: 3 }
    expect(applyP5Filters(draft, { lookupParentId: '2', lookupState: 'ready', optionIds: ['terminal-a'] }))
      .toMatchObject({ search: '  A  ', page: 0 })
    expect(() => applyP5Filters(draft, { lookupParentId: '1', lookupState: 'ready', optionIds: ['terminal-a'] })).toThrow()
    expect(applyP5Filters({ ...base }, { lookupState: 'denied' })).toEqual(base)
  })

  it('supports clear and page transitions without retaining stale pagination', () => {
    const applied = { ...base, merchantId: '2', terminalId: 'terminal-a', status: 1, search: 'A', page: 2 }
    expect(clearP5Filters(applied)).toEqual({ search: '', page: 0, size: 20 })
    expect(changeP5Page(base, 4).page).toBe(4)
  })
})
