import { describe, expect, it } from 'vitest'
import { classifyQrStatusCode, decodeDynamicQrPageResponse, decodeDynamicQrStatsResponse } from './contract'

function response(statusCode: number, overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      content: [
        {
          pkey: '0123456789abcdef0123456789abcdef',
          link: 'https://qrhub.uz/ExactPath?type=02&case=MiXeD',
          terminalType: 'WEB',
          terminalId: 'terminal-1',
          terminalName: 'Terminal A',
          merchantId: 2,
          merchantName: 'Merchant A',
          bankAccountId: 3,
          bankAccountName: 'Account A',
          amount: 100000,
          currencyAmount: 8.25,
          currencyCode: 'USD',
          rate: 12150.5,
          serviceFeeAmount: 125,
          statusCode,
          distributionStatus: 0,
          rrn: null,
          createdAt: '2026-09-15T10:30:45',
          updatedAt: '2026-09-15T10:35:45',
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
  it.each([0, 1875000, Number.MAX_SAFE_INTEGER])('decodes both stats totals as exact tiyin: %s', (totalServiceFeeAmount) => {
    const decoded = decodeDynamicQrStatsResponse({ success: true, data: { totalAmount: 125000000, totalServiceFeeAmount } })
    expect(decoded).toEqual({
      totalAmount: { minorUnits: '125000000', currency: 'UZS', scale: 2 },
      totalServiceFeeAmount: { minorUnits: String(totalServiceFeeAmount), currency: 'UZS', scale: 2 },
    })
    expect(Object.isFrozen(decoded)).toBe(true)
    expect(Object.isFrozen(decoded.totalServiceFeeAmount)).toBe(true)
  })

  it.each([undefined, null, '1875000', -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects malformed fee totals instead of falling back to zero: %s', (totalServiceFeeAmount) => {
    expect(() => decodeDynamicQrStatsResponse({ success: true, data: { totalAmount: 125000000, totalServiceFeeAmount } })).toThrow()
  })
  it.each([null, {}, { success: false, data: {} }, { success: true }, { success: true, data: [] }])('rejects a malformed stats success envelope: %s', (payload) => {
    expect(() => decodeDynamicQrStatsResponse(payload)).toThrow()
  })

  it.each([undefined, null, '125000000', -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects malformed total amount: %s', (totalAmount) => {
    expect(() => decodeDynamicQrStatsResponse({ success: true, data: { totalAmount, totalServiceFeeAmount: 1875000 } })).toThrow()
  })
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

  it('preserves source-confirmed detail fields without changing their values', () => {
    const row = decodeDynamicQrPageResponse(response(50)).content[0]
    expect(row).toMatchObject({
      terminalType: 'WEB', terminalId: 'terminal-1', merchantId: '2',
      bankAccountId: '3', bankAccountName: 'Account A', currencyAmount: 8.25,
      currencyCode: 'USD', rate: 12150.5, serviceFeeAmount: 125,
      distributionStatus: 0, updatedAt: '2026-09-15T10:35:45',
    })
  })

  it('keeps malformed or absent detail-only fields nullable', () => {
    const row = decodeDynamicQrPageResponse(response(50, {
      terminalType: null, terminalId: null, merchantId: 9007199254740992,
      bankAccountId: undefined, bankAccountName: null, currencyAmount: Number.NaN,
      currencyCode: null, rate: 'bad', serviceFeeAmount: undefined,
      distributionStatus: 1.5, updatedAt: 'not-a-date',
    })).content[0]
    expect(row).toMatchObject({
      terminalType: null, terminalId: null, merchantId: null,
      bankAccountId: null, bankAccountName: null, currencyAmount: null,
      currencyCode: null, rate: null, serviceFeeAmount: null,
      distributionStatus: null, updatedAt: null,
    })
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
