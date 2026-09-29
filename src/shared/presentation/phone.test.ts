import { describe, expect, it } from 'vitest'
import {
  formatUzbekLocalPhone,
  formatUzbekPhoneDisplay,
  normalizeUzbekPhoneWire,
  parseUzbekPhoneInput,
  toUzbekPhoneWire,
} from './phone'

describe('Uzbek phone presentation', () => {
  it.each([
    ['998881017980', '+998 88 101 79 80'],
    ['+998881017980', '+998 88 101 79 80'],
    ['998901234567', '+998 90 123 45 67'],
    ['  998881017980  ', '+998 88 101 79 80'],
  ])('formats supported value %s without numeric conversion', (value, expected) => {
    expect(formatUzbekPhoneDisplay(value)).toBe(expected)
  })

  it.each([
    ['9988810', '9988810'],
    ['99888A017980', '99888A017980'],
    ['  unsupported phone  ', 'unsupported phone'],
  ])('preserves unsupported value %s after trimming', (value, expected) => {
    expect(formatUzbekPhoneDisplay(value)).toBe(expected)
  })

  it.each([[''], ['   '], [null], [undefined]])(
    'renders empty or nullish value %s neutrally',
    (value) => {
      expect(formatUzbekPhoneDisplay(value)).toBe('')
    },
  )
})

describe('Uzbek phone editing', () => {
  it.each([
    ['', ''],
    ['8', '8'],
    ['88', '88'],
    ['881', '88 1'],
    ['88101', '88 101'],
    ['881017', '88 101 7'],
    ['8810179', '88 101 79'],
    ['881017980', '88 101 79 80'],
  ])('formats local digits %s progressively as %s', (input, expected) => {
    expect(formatUzbekLocalPhone(input)).toBe(expected)
  })

  it.each([
    ['', ''],
    ['+998', ''],
    ['998', '998'],
    ['881017980', '881017980'],
    ['+998 (88) 101-79-80', '881017980'],
    ['998 88 101 79 80', '881017980'],
    ['(88) 101-79-80', '881017980'],
  ])('normalizes supported editable input %s to local digits', (input, expected) => {
    expect(parseUzbekPhoneInput(input)).toBe(expected)
  })

  it.each([
    ['+997881017980'],
    ['8810179800'],
    ['9988810179800'],
    ['88A1017980'],
  ])('rejects unsupported or too-long editable input %s', (input) => {
    expect(parseUzbekPhoneInput(input)).toBeNull()
  })

  it('keeps incomplete local digits out of the canonical wire boundary', () => {
    expect(toUzbekPhoneWire('')).toBeNull()
    expect(toUzbekPhoneWire('88101798')).toBeNull()
    expect(toUzbekPhoneWire('881017980')).toBe('998881017980')
  })

  it('preserves tolerant Login and strict Cashier wire-normalization policies', () => {
    expect(normalizeUzbekPhoneWire('+998 (88) 101-79-80', true))
      .toBe('998881017980')
    expect(normalizeUzbekPhoneWire('+998881017980', false))
      .toBe('998881017980')
    expect(normalizeUzbekPhoneWire('998 881017980', false)).toBeNull()
  })
})
