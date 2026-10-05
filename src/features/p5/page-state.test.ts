import { describe, expect, it } from 'vitest'
import { changeP5MerchantDraft, changeP5Page, clearP5Filters, toP5ListQuery } from '@/shared/contracts/p5-filters'
import {
  applyP5Draft,
  applyP5AdvancedDraft,
  applyP5QuickSearch,
  createP5AdvancedDraft,
  changeP5AdvancedMerchant,
  reconcileP5AdvancedDraft,
  resolveP5StatusDraft,
  isP5StatusDraftValid,
  createDefaultP5Filters,
  p5ParentState,
  presentP5Status,
} from './page-state'

describe('P5 page state', () => {
  it.each([undefined, 0, 1, 777, -2147483648, 2147483647])('restores and serializes status %s without narrowing the integer contract', (status) => {
    const current = { ...createDefaultP5Filters(), status, search: ' device ', page: 3 }
    const draft = createP5AdvancedDraft(current)
    expect(resolveP5StatusDraft(draft.statusDraft)).toBe(status)
    expect(applyP5AdvancedDraft(current, draft, {})).toMatchObject({ status, search: 'device', page: 0 })
    const query = toP5ListQuery(applyP5AdvancedDraft(current, draft, {}))
    if (status === undefined) expect(query).not.toHaveProperty('status')
    else expect(query.status).toBe(String(status))
  })

  it.each(['', ' ', 'oops', '1.5', 'Infinity', '-2147483649', '2147483648'])('blocks invalid custom status %s without changing applied state', (code) => {
    const current = { ...createDefaultP5Filters(), status: 0, page: 3 }
    const draft = { ...createP5AdvancedDraft(current), statusDraft: { mode: 'custom' as const, code } }
    expect(isP5StatusDraftValid(draft.statusDraft)).toBe(false)
    expect(() => applyP5AdvancedDraft(current, draft, {})).toThrow()
    expect(current).toMatchObject({ status: 0, page: 3 })
  })

  it('preserves structured filters during search and quick search during drawer Apply', () => {
    const applied = { ...createDefaultP5Filters(), merchantId: '2', terminalId: 't1', status: 777, search: 'old', page: 3 }
    const searched = applyP5QuickSearch(applied, ' device ')
    expect(toP5ListQuery(searched)).toEqual({ merchantId: '2', terminalId: 't1', status: '777', search: 'device', page: '0', size: '20' })
    expect(applyP5QuickSearch(searched, ' device ')).toBe(searched)
    expect(toP5ListQuery(applyP5QuickSearch(searched, ' '))).toEqual({ merchantId: '2', terminalId: 't1', status: '777', page: '0', size: '20' })
    const changed = changeP5AdvancedMerchant(createP5AdvancedDraft(applied), '3')
    expect(changed.terminalId).toBeUndefined()
    const next = applyP5AdvancedDraft(applied, changed, { merchantIds: ['3'] })
    expect(next).toMatchObject({ merchantId: '3', terminalId: undefined, status: 777, search: 'old', page: 0 })
    expect(applied).toMatchObject({ merchantId: '2', terminalId: 't1', page: 3 })
  })

  it('reconciles confirmed missing drafts and preserves them on failure or wrong-parent results', () => {
    const applied = { ...createDefaultP5Filters(), merchantId: '2', terminalId: 't1', status: 777 }
    const draft = createP5AdvancedDraft(applied)
    const terminal = { lookupParentId: '2', lookupState: 'ready' as const, optionIds: [] }
    const cleared = reconcileP5AdvancedDraft(draft, { kind: 'ready', ids: ['2'] }, terminal)
    expect(cleared.terminalId).toBeUndefined()
    expect(toP5ListQuery(applyP5AdvancedDraft(applied, cleared, { merchantIds: ['2'], terminal }))).not.toHaveProperty('terminalId')
    expect(applied.terminalId).toBe('t1')
    expect(reconcileP5AdvancedDraft(draft, { kind: 'ready', ids: ['2'] }, { ...terminal, lookupState: 'error' })).toBe(draft)
    expect(reconcileP5AdvancedDraft(draft, { kind: 'ready', ids: ['2'] }, { ...terminal, lookupParentId: '3' })).toBe(draft)
    expect(reconcileP5AdvancedDraft(draft, { kind: 'ready', ids: [] }, terminal)).toMatchObject({ merchantId: undefined, terminalId: undefined })
  })

  it('resets structured filters, custom status mode, search and page together', () => {
    const reset = createDefaultP5Filters()
    expect(toP5ListQuery(reset)).toEqual({ page: '0', size: '20' })
    expect(createP5AdvancedDraft(reset)).toEqual({ merchantId: undefined, terminalId: undefined, statusDraft: { mode: 'all', code: '' } })
  })
  it('validates merchant and terminal parents while preserving status zero and resetting page', () => {
    const draft = { ...createDefaultP5Filters(), merchantId: '2', terminalId: 'terminal-a', status: 0, search: '  Device ', page: 4 }
    const applied = applyP5Draft(draft, {
      merchantIds: ['2'],
      terminal: { lookupParentId: '2', lookupState: 'ready', optionIds: ['terminal-a'] },
    })
    expect(toP5ListQuery(applied)).toEqual({ merchantId: '2', terminalId: 'terminal-a', status: '0', search: 'Device', page: '0', size: '20' })
    expect(() => applyP5Draft(draft, { merchantIds: ['1'], terminal: { lookupParentId: '2', lookupState: 'ready', optionIds: ['terminal-a'] } })).toThrow()
    expect(() => applyP5Draft(draft, { merchantIds: ['2'], terminal: { lookupParentId: '1', lookupState: 'ready', optionIds: ['terminal-a'] } })).toThrow()
  })

  it('keeps unfiltered reads usable without lookups and clears dependent/pagination state explicitly', () => {
    expect(p5ParentState(undefined, { kind: 'denied' })).toBe('ready')
    expect(p5ParentState('2', { kind: 'denied' })).toBe('pause')
    expect(changeP5MerchantDraft({ ...createDefaultP5Filters(), merchantId: '1', terminalId: 'terminal-a' }, '2').terminalId).toBeUndefined()
    const applied = { ...createDefaultP5Filters(), merchantId: '2', terminalId: 'terminal-a', status: 1, search: 'A', page: 3 }
    expect(clearP5Filters(applied)).toEqual(expect.objectContaining({ merchantId: undefined, terminalId: undefined, status: undefined, search: '', page: 0, size: 20 }))
    expect(changeP5Page(applied, 2).page).toBe(2)
  })

  it('presents only source-backed status meanings and keeps unknown/null neutral', () => {
    expect(presentP5Status(0)).toEqual({ label: 'Faol', active: true, tone: 'success' })
    expect(presentP5Status(1)).toEqual({
      label: 'Faol emas / administrator belgisi', active: false, tone: 'neutral',
    })
    expect(presentP5Status(777)).toEqual({ label: 'Holat noma’lum', active: false, tone: 'neutral' })
    expect(presentP5Status(null)).toEqual({ label: 'Holat noma’lum', active: false, tone: 'neutral' })
  })
})
