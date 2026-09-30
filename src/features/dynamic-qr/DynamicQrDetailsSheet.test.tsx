import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { DynamicQrDetailsContent } from './DynamicQrDetailsSheet'

const row: DynamicQrRow = {
  pkey: 'QR-EXACT-001',
  link: 'https://qrhub.uz/Exact/%2fPath?type=02&case=MiXeD',
  terminalType: 'WEB',
  terminalId: 'terminal-exact-1',
  createdAt: '2026-09-30T11:26:00',
  updatedAt: '2026-09-30T11:30:00',
  terminalName: 'Terminal A',
  merchantId: '12',
  merchantName: 'Merchant A',
  bankAccountId: '34',
  bankAccountName: 'Account A',
  amount: { minorUnits: '500000', currency: 'UZS', scale: 2 },
  currencyAmount: 41.25,
  currencyCode: 'USD',
  rate: 12150.5,
  serviceFeeAmount: 125,
  statusCode: 50,
  distributionStatus: 0,
  rrn: 'RRN-001',
}

describe('Dynamic QR details content', () => {
  it('renders grouped selected-row details using existing presenters', () => {
    const html = renderToString(<DynamicQrDetailsContent row={row} onViewQr={() => undefined} />)
    expect(html).toContain('QR-EXACT-001')
    expect(html).toContain('terminal-exact-1')
    expect(html).toContain('Merchant A')
    expect(html).toContain('Account A')
    expect(html).toContain('30.09.2026 11:26')
    expect(html).toContain('5 000.00 UZS')
    expect(html).toContain('12150.5')
    expect(html).toContain('Exact/%2fPath?type=02&amp;case=MiXeD')
    expect(html).toContain('Havolani nusxalash')
    expect(html).toContain('QR ko‘rish')
  })

  it('renders null values safely and exposes no QR or copy action for an unsafe link', () => {
    const html = renderToString(<DynamicQrDetailsContent row={{
      ...row,
      link: 'javascript:alert(1)',
      terminalType: null,
      terminalId: null,
      updatedAt: null,
      merchantId: null,
      bankAccountId: null,
      bankAccountName: null,
      currencyAmount: null,
      currencyCode: null,
      rate: null,
      serviceFeeAmount: null,
      distributionStatus: null,
      rrn: null,
    }} onViewQr={() => undefined} />)
    expect(html).toContain('Havola mavjud emas')
    expect(html).toContain('—')
    expect(html).not.toContain('Havolani nusxalash')
    expect(html).not.toContain('>QR ko‘rish<')
    expect(html).not.toContain('javascript:alert(1)')
  })
})
