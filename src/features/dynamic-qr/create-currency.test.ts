import { describe, expect, it } from 'vitest'
import { resolveCreateUzsCode } from './create-currency'

describe('Dynamic QR fixed create currency', () => {
  it('uses the authoritative exact UZS catalog code', () => {
    expect(resolveCreateUzsCode([
      { code: 'USD', nameUz: null, nameRu: null, nameEn: 'US Dollar', label: 'US Dollar', status: null },
      { code: 'UZS', nameUz: 'So‘m', nameRu: null, nameEn: null, label: 'So‘m', status: 1 },
    ])).toBe('UZS')
  })

  it('does not invent UZS when the authoritative catalog omits it', () => {
    expect(resolveCreateUzsCode([{
      code: 'USD', nameUz: null, nameRu: null, nameEn: 'US Dollar', label: 'US Dollar', status: null,
    }])).toBe('')
    expect(resolveCreateUzsCode(undefined)).toBe('')
  })
})
