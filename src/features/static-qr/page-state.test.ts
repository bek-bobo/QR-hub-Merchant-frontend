import { describe, expect, it } from 'vitest'
import { applyStaticTerminal, clearStaticTerminal,
  defaultStaticFilters, getStaticTerminalState, toStaticQrQuery } from './page-state'

const lookup = { enabled: true, pending: false, error: false,
  terminals: [{ id: 'terminal-a', name: 'A' }] }

describe('static QR applied filters', () => {
  it('starts at backend page zero and fixed size twenty with no extra filters', () => {
    expect(defaultStaticFilters).toEqual({ page: 0, size: 20 })
    expect(toStaticQrQuery(defaultStaticFilters)).toEqual({ page: '0', size: '20' })
  })

  it('applies only a confirmed terminal and resets the page', () => {
    const applied = applyStaticTerminal({ page: 4, size: 20 }, 'terminal-a', lookup)
    expect(applied).toEqual({ terminalId: 'terminal-a', page: 0, size: 20 })
    expect(toStaticQrQuery(applied!)).toEqual({ terminalId: 'terminal-a', page: '0', size: '20' })
  })

  it('never widens a lost applied terminal until explicit clear', () => {
    const applied = { terminalId: 'terminal-a', page: 2, size: 20 as const }
    for (const lost of [
      { ...lookup, enabled: false }, { ...lookup, error: true },
      { ...lookup, terminals: [] }, { ...lookup, pending: true },
    ]) {
      expect(getStaticTerminalState(applied, lost)).toBe('unconfirmed')
      expect(applyStaticTerminal(applied, 'terminal-a', lost)).toBeNull()
    }
    expect(toStaticQrQuery(applied)).toEqual({ terminalId: 'terminal-a', page: '2', size: '20' })
    expect(clearStaticTerminal(applied)).toEqual({ page: 0, size: 20 })
    expect(applyStaticTerminal(applied, '', { ...lookup, enabled: false }))
      .toEqual({ page: 0, size: 20 })
  })

  it('clears only by explicit action, retaining fixed size and a new query key', () => {
    const applied = { terminalId: 'terminal-a', page: 3, size: 20 as const }
    const cleared = clearStaticTerminal(applied)
    expect(cleared).toEqual({ page: 0, size: 20 })
    expect(toStaticQrQuery(cleared)).toEqual({ page: '0', size: '20' })
    expect(toStaticQrQuery(cleared)).not.toEqual(toStaticQrQuery(applied))
  })

  it('preserves zero-based page in the request without merchant or region filters', () => {
    expect(toStaticQrQuery({ terminalId: 'terminal-a', page: 2, size: 20 }))
      .toEqual({ terminalId: 'terminal-a', page: '2', size: '20' })
  })
})
