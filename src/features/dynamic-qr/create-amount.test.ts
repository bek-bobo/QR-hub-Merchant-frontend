import { describe, expect, it } from 'vitest'
import { parseCreateAmount } from './create-amount'

describe('create QR UZS amount', () => {
  it.each(['12 500.50', '12 500,50'])('accepts the displayed helper example %s', (input) => {
    expect(parseCreateAmount(input)).toBe('1250050')
  })
  it('uses exact minor units at both boundaries', () => {
    expect(parseCreateAmount('1000')).toBe('100000')
    expect(parseCreateAmount('1000.00')).toBe('100000')
    expect(parseCreateAmount(' 1000,00 ')).toBe('100000')
    expect(parseCreateAmount('1 000')).toBe('100000')
    expect(parseCreateAmount('1 000.00')).toBe('100000')
    expect(parseCreateAmount('1 000,00')).toBe('100000')
    expect(parseCreateAmount('1000.01')).toBe('100001')
    expect(parseCreateAmount('20000000.00')).toBe('2000000000')
    expect(parseCreateAmount('999.99')).toBeNull()
    expect(parseCreateAmount('20000000.01')).toBeNull()
  })
  it.each(['', '1  000', '10 00', '-1000', '1e3', '1000.001', '1000,0.0', 'Infinity'])('rejects %s', (input) => {
    expect(parseCreateAmount(input)).toBeNull()
  })
})
