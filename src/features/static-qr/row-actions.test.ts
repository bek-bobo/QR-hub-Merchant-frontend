import { describe, expect, it } from 'vitest'
import { staticQrRowActionLabels } from './row-actions'

describe('static QR row actions', () => {
  it('keeps the two approved actions in order', () => {
    expect(Object.values(staticQrRowActionLabels)).toEqual([
      'QR ko‘rish',
      'Qo‘shimcha ma’lumotlar',
    ])
  })
})
