import { describe, expect, it } from 'vitest'
import { applyDynamicQrAdvancedFilters, changeDynamicQrBankDraft, changeDynamicQrMerchantDraft,
  reconcileDynamicQrLookupDraft, type DynamicQrStructuredLookups } from './quick-filters'

const draft = { merchantId: '1', bankAccountId: '2', terminalId: 'T1', status: 0 as const, distributionStatus: 20 as const }
const evidence: DynamicQrStructuredLookups = {
  merchants: { enabled: true, pending: false, error: false, ids: ['1', '3'] },
  banks: { enabled: true, pending: false, error: false, ids: ['2', '3'], merchantId: '1' },
  terminals: { enabled: true, pending: false, error: false, ids: ['T1', 'T2'], merchantId: '1' },
}
describe('Dynamic QR bank draft dependency', () => {
  it.each(['3', undefined, '', '   '])('clears terminal on bank 2 → %j without changing other fields', (bank) => {
    expect(changeDynamicQrBankDraft(draft, bank)).toEqual({ ...draft, bankAccountId: bank?.trim() || undefined, terminalId: undefined })
    expect(draft.terminalId).toBe('T1')
  })
  it('clears a stale terminal when moving from no bank to a bank', () => {
    expect(changeDynamicQrBankDraft({ ...draft, bankAccountId: undefined }, '3')).toEqual({ ...draft, bankAccountId: '3', terminalId: undefined })
  })
  it.each(['2', ' 2 '])('keeps terminal and object identity for semantically identical bank %j', (bank) => {
    expect(changeDynamicQrBankDraft(draft, bank)).toBe(draft)
    expect(changeDynamicQrBankDraft({ ...draft, bankAccountId: ' 2 ' }, bank).terminalId).toBe('T1')
  })
  it('treats all empty bank representations as identical', () => {
    const empty = { ...draft, bankAccountId: undefined }
    expect(changeDynamicQrBankDraft(empty, ' ')).toBe(empty)
  })
  it('never resurrects the terminal after reselecting the old bank', () => {
    expect(changeDynamicQrBankDraft(changeDynamicQrBankDraft(draft, '3'), '2').terminalId).toBeUndefined()
  })
  it('retains an empty terminal while lookup is pending and after options containing the old terminal return', () => {
    const changed = changeDynamicQrBankDraft(draft, '3')
    expect(reconcileDynamicQrLookupDraft(changed, { ...evidence, terminals: { ...evidence.terminals, pending: true, ids: undefined } })).toBe(changed)
    expect(reconcileDynamicQrLookupDraft(changed, evidence)).toBe(changed)
    expect(changed.terminalId).toBeUndefined()
  })
  it('still clears bank and terminal on merchant change', () => {
    expect(changeDynamicQrMerchantDraft(draft, '3')).toEqual({ ...draft, merchantId: '3', bankAccountId: undefined, terminalId: undefined })
  })
  it('clears terminal when a confirmed missing bank is reconciled; failed/pending/wrong-parent evidence retains the draft', () => {
    expect(reconcileDynamicQrLookupDraft(draft, { ...evidence, banks: { ...evidence.banks, ids: [] } }))
      .toEqual({ ...draft, bankAccountId: undefined, terminalId: undefined })
    for (const banks of [{ ...evidence.banks, error: true, ids: [] }, { ...evidence.banks, pending: true, ids: [] },
      { ...evidence.banks, merchantId: '3', ids: [] }]) {
      expect(reconcileDynamicQrLookupDraft(draft, { ...evidence, banks })).toBe(draft)
    }
  })
  it('allows empty terminal, validates explicit new terminal, and rejects stale/mismatched evidence on Apply', () => {
    const current = { ...draft, fromDate: '2026-09-01', toDate: '2026-09-15', search: '  abc  ', page: 3, size: 50 as const }
    const changed = changeDynamicQrBankDraft(draft, '3')
    expect(applyDynamicQrAdvancedFilters(current, changed, evidence)).toEqual({ ...current, bankAccountId: '3', terminalId: undefined, page: 0 })
    expect(applyDynamicQrAdvancedFilters(current, { ...changed, terminalId: 'T2' }, evidence).terminalId).toBe('T2')
    expect(() => applyDynamicQrAdvancedFilters(current, { ...changed, terminalId: 'lost' }, evidence)).toThrow()
    expect(() => applyDynamicQrAdvancedFilters(current, { ...changed, terminalId: 'T1' }, { ...evidence, terminals: { ...evidence.terminals, ids: ['T2'] } })).toThrow()
    expect(() => applyDynamicQrAdvancedFilters(current, { ...changed, terminalId: 'T2' }, { ...evidence, terminals: { ...evidence.terminals, merchantId: '3' } })).toThrow()
  })
})
