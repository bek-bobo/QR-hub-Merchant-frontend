import { describe, expect, it } from 'vitest'
import { classifyQrStatusCode, decodeDynamicQrPageResponse } from './contract'

function response(statusCode: number, overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      content: [
        {
          pkey: '0123456789abcdef0123456789abcdef',
          link: 'https://qrhub.uz/ExactPath?type=02&case=MiXeD',
          terminalName: 'Terminal A',
          merchantName: 'Merchant A',
          amount: 100000,
          currencyAmount: null,
          currencyCode: null,
          statusCode,
          rrn: null,
          createdAt: '2026-09-15T10:30:45',
          ...overrides,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 10,
    },
  }
}

describe('dynamic QR read contract', () => {
  it('maps only source-confirmed status meanings', () => {
    expect([
      classifyQrStatusCode(0),
      classifyQrStatusCode(5),
      classifyQrStatusCode(10),
      classifyQrStatusCode(20),
      classifyQrStatusCode(25),
      classifyQrStatusCode(50),
      classifyQrStatusCode(777),
    ]).toEqual([
      'new',
      'expired',
      'processing',
      'cancelled',
      'rejected',
      'success',
      'unknown',
    ])
  })

  it('preserves status zero and exact UZS minor units', () => {
    const decoded = decodeDynamicQrPageResponse(response(0))

    expect(decoded.content[0]?.statusCode).toBe(0)
    expect(decoded.content[0]?.amount).toEqual({
      minorUnits: '100000',
      currency: 'UZS',
      scale: 2,
    })
    expect(decoded.content[0]?.rrn).toBeNull()
    expect(decoded.content[0]?.link).toBe('https://qrhub.uz/ExactPath?type=02&case=MiXeD')
  })

  it.each([undefined, null, '', 42])('keeps an unavailable row link from breaking list decoding: %s', (link) => {
    expect(decodeDynamicQrPageResponse(response(50, { link })).content[0]?.link).toBeNull()
  })

  it('preserves an unknown future integer status neutrally', () => {
    expect(decodeDynamicQrPageResponse(response(777)).content[0]?.statusCode)
      .toBe(777)
  })

  it('rejects malformed pagination instead of creating a fake empty page', () => {
    const malformed = response(50)
    malformed.data.content = null as never

    expect(() => decodeDynamicQrPageResponse(malformed)).toThrow()
  })

  it('rejects an unsafe JSON Long amount', () => {
    expect(() =>
      decodeDynamicQrPageResponse(
        response(50, { amount: 9007199254740992 }),
      ),
    ).toThrow()
  })
})
