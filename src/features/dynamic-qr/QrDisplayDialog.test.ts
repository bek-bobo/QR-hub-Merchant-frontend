import { describe, expect, it } from 'vitest'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { presentDynamicQrRowLink } from './qr-presentation'

const row: DynamicQrRow = {
  pkey: 'qr-row-1',
  link: 'https://qrhub.uz/Exact/%2fPath?type=02&case=MiXeD#Part%2FOne',
  terminalType: null,
  terminalId: null,
  createdAt: '2026-09-30T10:20:30',
  updatedAt: null,
  terminalName: 'Terminal A',
  merchantId: null,
  merchantName: 'Merchant A',
  bankAccountId: null,
  bankAccountName: null,
  amount: { minorUnits: '100000', currency: 'UZS', scale: 2 },
  currencyAmount: null,
  currencyCode: null,
  rate: null,
  serviceFeeAmount: null,
  statusCode: 50,
  distributionStatus: null,
  rrn: null,
}

describe('Dynamic QR row presentation policy', () => {
  it('preserves the exact authoritative row link', () => {
    expect(presentDynamicQrRowLink(row)).toEqual({ kind: 'available', original: row.link })
  })

  it.each([null, '', 'javascript:alert(1)', '/relative', 'https://user:pass@qrhub.uz/pay'])
  ('keeps missing or unsafe row link unavailable: %s', (link) => {
    expect(presentDynamicQrRowLink({ ...row, link })).toEqual({ kind: 'unavailable' })
  })
})
