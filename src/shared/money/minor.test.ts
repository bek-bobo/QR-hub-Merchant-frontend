import { describe, expect, it } from 'vitest'
import { formatMinorUnits, formatMinorValue } from './minor'

describe('minor unit formatting', () => {
  it('formats exact integer strings with BigInt arithmetic', () => {
    expect(
      formatMinorUnits({
        minorUnits: '900719925474099300',
        currency: 'UZS',
        scale: 2,
      }),
    ).toBe('9 007 199 254 740 993.00 UZS')
  })

  it.each([
    [{ minorUnits: '0', scale: 0 }, '0'],
    [{ minorUnits: '1000', scale: 0 }, '1 000'],
    [{ minorUnits: '-123456', scale: 0 }, '-123 456'],
    [{ minorUnits: '100000', scale: 2 }, '1 000.00'],
    [{ minorUnits: '900719925474099300', scale: 2 }, '9 007 199 254 740 993.00'],
  ])('groups exact value $minorUnits at scale $scale', (input, expected) => {
    expect(formatMinorValue(input)).toBe(expected)
  })

  it('rejects unsafe numbers and invalid scale or currency', () => {
    expect(() =>
      formatMinorUnits({
        minorUnits: 9007199254740992,
        currency: 'UZS',
        scale: 2,
      }),
    ).toThrow()
    expect(() =>
      formatMinorUnits({ minorUnits: '100', currency: '', scale: 2 }),
    ).toThrow()
    expect(() =>
      formatMinorUnits({ minorUnits: '100', currency: 'UZS', scale: -1 }),
    ).toThrow()
  })
})
