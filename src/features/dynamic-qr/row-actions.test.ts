import { describe, expect, it } from 'vitest'
import { dynamicQrRowActionLabels } from './row-actions'

describe('Dynamic QR row actions', () => {
  it('keeps QR and details actions in the fixed action menu', () => {
    expect(dynamicQrRowActionLabels).toEqual({
      viewQr: 'QR ko‘rish',
      viewDetails: 'Qo‘shimcha ma’lumotlar',
    })
  })
})
