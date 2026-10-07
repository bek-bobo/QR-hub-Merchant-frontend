import { describe, expect, it } from 'vitest'
import { toDynamicQrExportQuery } from './export-filters'
import { applyExportDraft } from './export-page-state'
import { createDefaultDynamicQrFilters, getTerminalFilterState, parseQrStatusInput,
  type TerminalLookupState } from './page-state'

const initial = createDefaultDynamicQrFilters(new Date('2026-09-17T00:00:00Z'))
const available = { lookupEnabled: true, lookupPending: false, lookupError: false,
  terminals: [{ id: 'terminal-a', name: 'Terminal A' }] }
const unavailable = { lookupEnabled: false, lookupPending: false, lookupError: false }
const lostLookupCases: readonly TerminalLookupState[] = [
  unavailable,
  { ...available, lookupError: true },
  { ...available, terminals: [] },
]

describe('standalone export filter application', () => {
  it('applies supported structured selections only after all selected lookups confirm them', () => {
    const draft = { ...initial, merchantId: '1', bankAccountId: '2', terminalId: 'terminal-a',
      status: 25 as const, distributionStatus: 20 as const }
    const structured = {
      merchants: { enabled: true, pending: false, error: false, ids: ['1'] },
      banks: { enabled: true, pending: false, error: false, ids: ['2'], merchantId: '1' },
      terminals: { enabled: true, pending: false, error: false, ids: ['terminal-a'], merchantId: '1' },
    }
    const result = applyExportDraft(draft, available, structured)
    expect(result).toMatchObject({ kind: 'applied', filters: { merchantId: '1', bankAccountId: '2', status: 25, distributionStatus: 20 } })
    expect(applyExportDraft(draft, available, { ...structured, banks: { ...structured.banks, error: true } }))
      .toEqual({ kind: 'structured-unconfirmed' })
    expect(initial).not.toHaveProperty('merchantId')
  })
  it('allows export without terminal lookup when no terminal was selected', () => {
    const result = applyExportDraft({ ...initial, search: '  Terminal A  ', status: 0 }, unavailable)
    expect(result).toMatchObject({ kind: 'applied', filters: { search: '  Terminal A  ', status: 0 } })
    if (result.kind !== 'applied') throw Error('Expected applied filters')
    expect(toDynamicQrExportQuery(result.filters)).toMatchObject({ status: '0', search: '  Terminal A  ' })
    expect(toDynamicQrExportQuery(result.filters)).not.toHaveProperty('terminalId')
  })

  it('keeps a current-user terminal only after lookup confirms it', () => {
    const result = applyExportDraft({ ...initial, terminalId: 'terminal-a' }, available)
    expect(result).toMatchObject({ kind: 'applied', filters: { terminalId: 'terminal-a' } })
    if (result.kind !== 'applied') throw Error('Expected applied filters')
    expect(toDynamicQrExportQuery(result.filters).terminalId).toBe('terminal-a')
  })

  it.each(lostLookupCases)('never widens a lost selected terminal', (lookup) => {
    expect(applyExportDraft({ ...initial, terminalId: 'terminal-a' }, lookup))
      .toEqual({ kind: 'terminal-unconfirmed' })
    expect(getTerminalFilterState({ ...initial, terminalId: 'terminal-a' }, lookup))
      .toBe('invalid')
  })

  it('rejects an invalid date range before it becomes applied', () => {
    expect(applyExportDraft({ ...initial, fromDate: '2026-09-18', toDate: '2026-09-17' }, available))
      .toEqual({ kind: 'invalid-date' })
  })

  it('does not change an applied snapshot when only a draft changes', () => {
    const result = applyExportDraft(initial, available)
    if (result.kind !== 'applied') throw Error('Expected applied filters')
    const draft = { ...result.filters, search: 'Changed' }
    expect(result.filters.search).toBe('')
    expect(draft.search).toBe('Changed')
  })

  it('accepts rejected transaction status without changing unknown-code handling', () => {
    expect(parseQrStatusInput('0')).toBe(0)
    expect(parseQrStatusInput('25')).toBe(25)
    expect(() => parseQrStatusInput('777')).toThrow()
  })
})
