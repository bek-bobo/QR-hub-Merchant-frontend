import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { DYNAMIC_QR_DEFAULT_COLUMN_ORDER } from './columns'
import { DynamicQrTableContent } from './DynamicQrTable'

const row: DynamicQrRow = {
  pkey: 'qr-row-1',
  link: 'https://qrhub.uz/ExactPath?type=02&case=MiXeD',
  createdAt: '2026-09-17T10:20:30',
  terminalName: 'Terminal A',
  merchantName: 'Merchant A',
  amount: { minorUnits: '123456', currency: 'UZS', scale: 2 },
  statusCode: 50,
  rrn: 'RRN-1',
}

function cellTexts(html: string, tag: 'th' | 'td'): string[] {
  return Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'g')))
    .map((match) => match[1]?.replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '') ?? '')
}

describe('DynamicQrTable column preferences pilot', () => {
  const onViewQr = () => undefined

  it('keeps the production default header order', () => {
    const html = renderToStaticMarkup(
      <DynamicQrTableContent rows={[row]} columnOrder={DYNAMIC_QR_DEFAULT_COLUMN_ORDER} onViewQr={onViewQr} />,
    )
    expect(cellTexts(html, 'th')).toEqual([
      'QR ID', 'Yaratilgan vaqt', 'Terminal', 'Merchant', 'Summa', 'Status', 'RRN', 'QR ko‘rish',
    ])
  })

  it('uses one resolved order for both headers and body cells', () => {
    const order = ['rrn', 'status', 'amount', 'merchant', 'terminal', 'createdAt', 'qrId'] as const
    const html = renderToStaticMarkup(
      <DynamicQrTableContent rows={[row]} columnOrder={order} onViewQr={onViewQr} />,
    )

    expect(cellTexts(html, 'th')).toEqual([
      'RRN', 'Status', 'Summa', 'Merchant', 'Terminal', 'Yaratilgan vaqt', 'QR ID', 'QR ko‘rish',
    ])
    expect(cellTexts(html, 'td')).toEqual([
      'RRN-1', 'Muvaffaqiyatli', '1 234.56 UZS', 'Merchant A', 'Terminal A',
      '17.09.2026 10:20', 'qr-row-1', 'QR ko‘rish',
    ])
  })

  it('preserves row data while rendering existing formatters and status presentation', () => {
    const before = JSON.stringify(row)
    const html = renderToStaticMarkup(
      <DynamicQrTableContent rows={[row]} columnOrder={DYNAMIC_QR_DEFAULT_COLUMN_ORDER} onViewQr={onViewQr} />,
    )

    expect(html).toContain('Muvaffaqiyatli')
    expect(html).toContain('1 234.56 UZS')
    expect(html).toContain('17.09.2026 10:20')
    expect(JSON.stringify(row)).toBe(before)
  })

  it('keeps QR viewing fixed after every reorderable business column', () => {
    const html = renderToStaticMarkup(
      <DynamicQrTableContent rows={[row]} columnOrder={['rrn', 'qrId']} onViewQr={onViewQr} />,
    )
    const headers = cellTexts(html, 'th')
    expect(headers[headers.length - 1]).toBe('QR ko‘rish')
    expect(html).toContain('type="button"')
  })
})
