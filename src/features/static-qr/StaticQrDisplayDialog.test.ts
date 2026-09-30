import { describe, expect, it } from 'vitest'
import { presentQrLink } from '@/features/dynamic-qr/qr-presentation'

describe('static QR list link presentation', () => {
  it('preserves the exact approved HTTPS row link', () => {
    const link = 'https://pay.example/Static/QR?Case=Exact&value=%2F'
    expect(presentQrLink(link)).toEqual({ kind: 'available', original: link })
  })

  it('does not substitute redirectUrl when the QR link is missing or unsafe', () => {
    const redirectUrl = 'https://merchant.example/return'
    expect(redirectUrl).toContain('https://')
    expect(presentQrLink(null)).toEqual({ kind: 'unavailable' })
    expect(presentQrLink('http://pay.example/qr')).toEqual({ kind: 'unavailable' })
  })
})
