import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { CancelQrConfirmationBody, CancelQrOutcome } from './CancelQrConfirmation'

describe('cancel confirmation and outcome copy', () => {
  it('shows the exact row identifier and payment warning before a fake dispatch', () => {
    const html = renderToString(<CancelQrConfirmationBody pkey="row/%2Bopaque" pending={false}
      onDismiss={() => undefined} onConfirm={() => undefined} />)
    expect(html).toContain('QR ni bekor qilish')
    expect(html).toContain('row/%2Bopaque')
    expect(html).toContain('to‘lov mavjudligiga ta’sir qilishi mumkin')
    expect(html).toContain('Ortga')
    expect(html).toContain('Tasdiqlash')
    expect(html).not.toContain('qaytarib bo‘lmaydi')
  })

  it('distinguishes confirmed, rejected, not-sent and unknown without a blind retry', () => {
    const confirmed = renderToString(<CancelQrOutcome outcome={{ kind: 'confirmed', data: null }} />)
    const rejected = renderToString(<CancelQrOutcome outcome={{ kind: 'rejected', reason: 'Bekor qilish so‘rovi rad etildi.' }} />)
    const notSent = renderToString(<CancelQrOutcome outcome={{ kind: 'not-sent', reason: 'Ruxsat mavjud emas.' }} />)
    const unknown = renderToString(<CancelQrOutcome outcome={{ kind: 'unknown', reason: 'uncertain' }} />)
    expect(confirmed).toContain('Bekor qilish so‘rovi tasdiqlandi')
    expect(rejected).toContain('rad etildi')
    expect(notSent).toContain('yuborilmadi')
    expect(unknown).toContain('serverga yetgan bo‘lishi mumkin')
    expect(unknown).toContain('Takroriy so‘rov xavfsizligi tasdiqlanmagan')
    expect(unknown).not.toContain('Qayta yuborish</button>')
    expect(renderToString(<CancelQrOutcome outcome={{ kind: 'stale' }} />)).toBe('')
  })
})
