import { describe, expect, it } from 'vitest'
import { formatUzbekPhoneDisplay } from './phone'

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
