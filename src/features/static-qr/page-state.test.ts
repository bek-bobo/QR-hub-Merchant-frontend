import { describe, expect, it } from 'vitest'
import { applyStaticTerminal, clearStaticTerminal,
  defaultStaticFilters, getStaticTerminalState, toStaticQrQuery, applyStaticQrAdvancedDraft, applyStaticQrQuickSearch,
  changeStaticMerchantDraft, changeStaticRegionDraft, reconcileStaticQrDraft, staticQrFiltersConfirmed, type StaticQrLookupEvidence } from './page-state'

const lookup = { enabled: true, pending: false, error: false,
  terminals: [{ id: 'terminal-a', name: 'A' }] }

describe('static QR applied filters', () => {
  const applied = { merchantId: '1', terminalId: 'T-Exact', regionId: '3', districtId: '4', search: 'old', page: 5, size: 20 as const }
  const valid: StaticQrLookupEvidence = { merchant: { lookupState: 'ready', optionIds: ['1'] },
    terminal: { lookupState: 'ready', lookupParentId: '1', optionIds: ['T-Exact'] },
    region: { lookupState: 'ready', optionIds: ['3'] }, district: { lookupState: 'ready', lookupParentId: '3', optionIds: ['4'] } }

  it('commits confirmed structured selections preserving quick search and resetting page', () => {
    expect(applyStaticQrAdvancedDraft(applied, applied, valid)).toEqual({ ...applied, page: 0 })
    expect(applied.page).toBe(5)
    expect(staticQrFiltersConfirmed(applied, valid)).toBe(true)
  })

  it('commits raw search and empty effective search without altering applied structured filters', () => {
    const next = applyStaticQrQuickSearch(applied, '  QR-Exact  ')
    expect(next).toEqual({ ...applied, search: '  QR-Exact  ', page: 0 })
    expect(applyStaticQrQuickSearch(next, '  QR-Exact  ')).toBe(next)
    expect(applyStaticQrQuickSearch(next, '')).toEqual({ ...applied, search: '', page: 0 })
    expect(clearStaticTerminal({ ...applied, size: 25 })).toEqual({ search: '', page: 0, size: 25 })
  })

  it('clears only dependent drafts when merchant or region changes before Apply', () => {
    expect(changeStaticMerchantDraft(applied, '5')).toMatchObject({ merchantId: '5', terminalId: undefined, regionId: '3', districtId: '4' })
    expect(changeStaticRegionDraft(applied, '7')).toMatchObject({ merchantId: '1', terminalId: 'T-Exact', regionId: '7', districtId: undefined })
    expect(applied).toMatchObject({ merchantId: '1', terminalId: 'T-Exact', regionId: '3', districtId: '4', page: 5 })
  })

  it('reconciles successful empty child domains and omits stale IDs when applied', () => {
    const evidence = { ...valid, terminal: { ...valid.terminal, optionIds: [] }, district: { ...valid.district, optionIds: [] } }
    const draft = reconcileStaticQrDraft(applied, evidence)
    expect(draft).toMatchObject({ terminalId: undefined, districtId: undefined })
    expect(toStaticQrQuery(applyStaticQrAdvancedDraft(applied, draft, evidence)!))
      .toEqual({ merchantId: '1', regionId: '3', search: 'old', page: '0', size: '20' })
    expect(applied).toMatchObject({ terminalId: 'T-Exact', districtId: '4', page: 5 })
  })

  it.each(['error', 'loading', 'unavailable'] as const)('retains selections and blocks unconfirmed %s Apply', (lookupState) => {
    const evidence = { ...valid, terminal: { ...valid.terminal, lookupState }, district: { ...valid.district, lookupState } }
    expect(reconcileStaticQrDraft(applied, evidence)).toBe(applied)
    expect(applyStaticQrAdvancedDraft(applied, applied, evidence)).toBeNull()
    expect(staticQrFiltersConfirmed({}, evidence)).toBe(true)
  })

  it('rejects unknown parents and children and mismatched lookup domains', () => {
    for (const evidence of [
      { ...valid, merchant: { ...valid.merchant, optionIds: [] } },
      { ...valid, region: { ...valid.region, optionIds: [] } },
      { ...valid, terminal: { ...valid.terminal, lookupParentId: '5' } },
      { ...valid, terminal: { ...valid.terminal, optionIds: [] } },
      { ...valid, district: { ...valid.district, lookupParentId: '7' } },
    ]) expect(applyStaticQrAdvancedDraft(applied, applied, evidence)).toBeNull()
    expect(applyStaticQrAdvancedDraft(applied, { ...applied, regionId: undefined }, valid)).toBeNull()
    expect(staticQrFiltersConfirmed({ terminalId: 'Global' }, { ...valid,
      terminal: { lookupState: 'ready', optionIds: ['Global'] } })).toBe(true)
  })

  it('serializes exactly the supported whitelist, omits empty fields and validates numeric IDs', () => {
    const extra = { status: 0, fromDate: 'date', toDate: 'date', bankAccountId: '2', terminalType: 'WEB', sort: 'name' }
    expect(toStaticQrQuery({ ...extra, ...applied, merchantId: ' 1 ', terminalId: ' T-Exact ', regionId: ' 3 ', districtId: ' 4 ', search: ' old ' }))
      .toEqual({ merchantId: '1', terminalId: 'T-Exact', regionId: '3', districtId: '4', search: ' old ', page: '5', size: '20' })
    expect(toStaticQrQuery({ ...defaultStaticFilters, merchantId: ' ', terminalId: '', regionId: '', districtId: ' ', search: ' ' }))
      .toEqual({ search: ' ', page: '0', size: '20' })
    for (const field of ['merchantId', 'regionId', 'districtId'] as const) {
      for (const id of ['bad', '-1', '1.1', '9007199254740992']) expect(() => toStaticQrQuery({ ...applied, [field]: id })).toThrow()
    }
    expect(() => toStaticQrQuery({ ...applied, regionId: undefined })).toThrow()
    expect(() => toStaticQrQuery({ ...applied, page: -1 })).toThrow()
  })
  it('starts at backend page zero and fixed size twenty with no extra filters', () => {
    expect(defaultStaticFilters).toEqual({ search: '', page: 0, size: 20 })
    expect(toStaticQrQuery(defaultStaticFilters)).toEqual({ page: '0', size: '20' })
  })

  it('applies only a confirmed terminal and resets the page', () => {
    const applied = applyStaticTerminal({ search: '', page: 4, size: 20 }, 'terminal-a', lookup)
    expect(applied).toEqual({ terminalId: 'terminal-a', search: '', page: 0, size: 20 })
    expect(toStaticQrQuery(applied!)).toEqual({ terminalId: 'terminal-a', page: '0', size: '20' })
  })

  it('never widens a lost applied terminal until explicit clear', () => {
    const applied = { terminalId: 'terminal-a', search: '', page: 2, size: 20 as const }
    for (const lost of [
      { ...lookup, enabled: false }, { ...lookup, error: true },
      { ...lookup, terminals: [] }, { ...lookup, pending: true },
    ]) {
      expect(getStaticTerminalState(applied, lost)).toBe('unconfirmed')
      expect(applyStaticTerminal(applied, 'terminal-a', lost)).toBeNull()
    }
    expect(toStaticQrQuery(applied)).toEqual({ terminalId: 'terminal-a', page: '2', size: '20' })
    expect(clearStaticTerminal(applied)).toEqual({ search: '', page: 0, size: 20 })
    expect(applyStaticTerminal(applied, '', { ...lookup, enabled: false }))
      .toEqual({ search: '', page: 0, size: 20 })
  })

  it('clears only by explicit action, retaining fixed size and a new query key', () => {
    const applied = { terminalId: 'terminal-a', search: '', page: 3, size: 20 as const }
    const cleared = clearStaticTerminal(applied)
    expect(cleared).toEqual({ search: '', page: 0, size: 20 })
    expect(toStaticQrQuery(cleared)).toEqual({ page: '0', size: '20' })
    expect(toStaticQrQuery(cleared)).not.toEqual(toStaticQrQuery(applied))
  })

  it('preserves zero-based page in the request without merchant or region filters', () => {
    expect(toStaticQrQuery({ terminalId: 'terminal-a', search: '', page: 2, size: 20 }))
      .toEqual({ terminalId: 'terminal-a', page: '2', size: '20' })
  })
})
