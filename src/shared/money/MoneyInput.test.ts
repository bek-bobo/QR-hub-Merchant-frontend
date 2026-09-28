import { describe, expect, it } from 'vitest'
import { formatMoneyInputEdit } from './money-input-edit'

describe('grouped money input editing', () => {
  it.each([
    ['0', 1, { value: '0', selectionStart: 1 }],
    ['1000', 4, { value: '1 000', selectionStart: 5 }],
    ['100000000', 9, { value: '100 000 000', selectionStart: 11 }],
    ['1000.00', 7, { value: '1 000.00', selectionStart: 8 }],
    ['1000,00', 7, { value: '1 000,00', selectionStart: 8 }],
    ['1 000 000,25', 12, { value: '1 000 000,25', selectionStart: 12 }],
  ])('formats %s without losing its semantic caret', (value, selectionStart, expected) => {
    expect(formatMoneyInputEdit(value, selectionStart)).toEqual(expected)
  })

  it('keeps a middle edit near the edited digit instead of jumping to the end', () => {
    expect(formatMoneyInputEdit('1234 456', 4)).toEqual({
      value: '1 234 456',
      selectionStart: 5,
    })
  })

  it('restores a deleted grouping separator without moving the caret to the end', () => {
    expect(formatMoneyInputEdit('1234', 1)).toEqual({
      value: '1 234',
      selectionStart: 1,
    })
  })

  it.each(['-1', '1e3', '1.234', '1,0.0', 'abc'])('rejects unsupported edit %s', (value) => {
    expect(formatMoneyInputEdit(value, value.length)).toBeNull()
  })
})
