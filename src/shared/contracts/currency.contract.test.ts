import { describe, expect, it } from 'vitest'
import { decodeCurrencyOptionsResponse } from './currency.contract'

describe('currency raw list contract', () => {
  it('preserves exact codes, localized names and unknown status values', () => {
    expect(decodeCurrencyOptionsResponse([
      { code: 'ABC', nameUz: 'Uz nom', nameRu: 'Ru nom', nameEn: 'En name', status: 7 },
      { code: 'xYz', nameUz: null, nameRu: 'Ru nom', nameEn: null, status: null },
      { code: 'XYZ', nameUz: null, nameRu: null, nameEn: null },
    ])).toEqual([
      { code: 'ABC', nameUz: 'Uz nom', nameRu: 'Ru nom', nameEn: 'En name', status: 7, label: 'Uz nom' },
      { code: 'xYz', nameUz: null, nameRu: 'Ru nom', nameEn: null, status: null, label: 'Ru nom' },
      { code: 'XYZ', nameUz: null, nameRu: null, nameEn: null, status: null, label: 'XYZ' },
    ])
  })

  it('requires a raw array and fails the whole list for a malformed code', () => {
    expect(() => decodeCurrencyOptionsResponse({ success: true, data: [] })).toThrow()
    expect(() => decodeCurrencyOptionsResponse([{ code: 'ABC' }, { code: ' ' }])).toThrow()
    expect(() => decodeCurrencyOptionsResponse([{ code: null }])).toThrow()
  })

  it('rejects malformed names and status without assuming ACTIVE or a code catalog', () => {
    expect(() => decodeCurrencyOptionsResponse([{ code: 'ABC', nameUz: 1 }])).toThrow()
    expect(() => decodeCurrencyOptionsResponse([{ code: 'ABC', status: 'ACTIVE' }])).toThrow()
    expect(() => decodeCurrencyOptionsResponse([{ code: 'ABC', status: 32768 }])).toThrow()
    expect(decodeCurrencyOptionsResponse([{ code: 'QWE', status: -1 }])).toHaveLength(1)
  })
})
