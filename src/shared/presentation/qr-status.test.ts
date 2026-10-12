import { describe, expect, it } from 'vitest'
import { presentQrStatus } from './qr-status'

describe('QR status presentation', () => {
  it.each([
    [0, 'Yangi', 'info'],
    [5, 'Muddati o‘tgan', 'error'],
    [10, 'Jarayonda', 'warning'],
    [20, 'Bekor qilingan', 'error'],
    [25, 'Rad etilgan', 'error'],
    [50, 'Muvaffaqiyatli', 'success'],
    [777, 'Noma’lum', 'neutral'],
  ] as const)('maps raw status %s to its existing label and semantic tone', (statusCode, label, tone) => {
    expect(presentQrStatus(statusCode)).toEqual({ label, tone })
  })

  it('keeps an unknown raw status intact without exposing it in the label', () => {
    const statusCode = 777
    const presentation = presentQrStatus(statusCode)

    expect(presentation).toEqual({ label: 'Noma’lum', tone: 'neutral' })
    expect(presentation.label).not.toContain('777')
    expect(statusCode).toBe(777)
  })

})
