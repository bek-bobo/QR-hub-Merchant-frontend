import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { DYNAMIC_QR_DEFAULT_COLUMN_ORDER } from './columns'
import { DynamicQrTableContent } from './DynamicQrTable'

const row: DynamicQrRow = {
  pkey: 'qr-row-1',
  link: 'https://qrhub.uz/ExactPath?type=02&case=MiXeD',
  terminalType: 'WEB',
  terminalId: 'terminal-1',
  createdAt: '2026-09-17T10:20:30',
  updatedAt: '2026-09-17T10:25:30',
  terminalName: 'Terminal A',
  merchantId: '2',
  merchantName: 'Merchant A',
  bankAccountId: '3',
  bankAccountName: 'Account A',
  amount: { minorUnits: '123456', currency: 'UZS', scale: 2 },
  currencyAmount: null,
  currencyCode: null,
  rate: null,
  serviceFeeAmount: null,
  statusCode: 50,
  distributionStatus: 0,
  rrn: 'RRN-1',
}

function cellTexts(html: string, tag: 'th' | 'td'): string[] {
  return Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'g')))
    .map((match) => match[1]?.replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '') ?? '')
}

describe('DynamicQrTable column preferences pilot', () => {
  const onViewQr = () => undefined
  const onViewDetails = () => undefined

  it('keeps the production default header order', () => {
    const html = renderToStaticMarkup(
      <DynamicQrTableContent rows={[row]} columnOrder={DYNAMIC_QR_DEFAULT_COLUMN_ORDER}
        visibleColumnIds={DYNAMIC_QR_DEFAULT_COLUMN_ORDER}
        onViewQr={onViewQr} onViewDetails={onViewDetails} />,
    )
    expect(cellTexts(html, 'th')).toEqual([
      'QR ID', 'Yaratilgan vaqt', 'Terminal', 'Merchant', 'Summa', 'Status', 'RRN', 'Amallar',
    ])
  })

  it('renders a drag-reordered state consistently in headers and body cells', () => {
    const order = ['rrn', 'status', 'amount', 'merchant', 'terminal', 'createdAt', 'qrId'] as const
    const html = renderToStaticMarkup(
      <DynamicQrTableContent rows={[row]} columnOrder={order}
        visibleColumnIds={DYNAMIC_QR_DEFAULT_COLUMN_ORDER}
        onViewQr={onViewQr} onViewDetails={onViewDetails} />,
    )

    expect(cellTexts(html, 'th')).toEqual([
      'RRN', 'Status', 'Summa', 'Merchant', 'Terminal', 'Yaratilgan vaqt', 'QR ID', 'Amallar',
    ])
    expect(cellTexts(html, 'td')).toEqual([
      'RRN-1', 'Muvaffaqiyatli', '1 234.56 UZS', 'Merchant A', 'Terminal A',
      '17.09.2026 10:20', 'qr-row-1', '',
    ])
  })

  it('preserves row data while rendering existing formatters and status presentation', () => {
    const before = JSON.stringify(row)
    const html = renderToStaticMarkup(
      <DynamicQrTableContent rows={[row]} columnOrder={DYNAMIC_QR_DEFAULT_COLUMN_ORDER}
        visibleColumnIds={DYNAMIC_QR_DEFAULT_COLUMN_ORDER}
        onViewQr={onViewQr} onViewDetails={onViewDetails} />,
    )

    expect(html).toContain('Muvaffaqiyatli')
    expect(html).toContain('1 234.56 UZS')
    expect(html).toContain('17.09.2026 10:20')
    expect(JSON.stringify(row)).toBe(before)
  })

  it('keeps QR viewing fixed after every reorderable business column', () => {
    const html = renderToStaticMarkup(
      <DynamicQrTableContent rows={[row]} columnOrder={['rrn', 'qrId']}
        visibleColumnIds={DYNAMIC_QR_DEFAULT_COLUMN_ORDER}
        onViewQr={onViewQr} onViewDetails={onViewDetails} />,
    )
    const headers = cellTexts(html, 'th')
    expect(headers[headers.length - 1]).toBe('Amallar')
    expect(html).toContain('aria-label="Amallarni ochish"')
  })

  it('renders only visible business columns in their persisted order', () => {
    const html = renderToStaticMarkup(
      <DynamicQrTableContent
        rows={[row]}
        columnOrder={['rrn', 'status', 'amount', 'merchant', 'terminal', 'createdAt', 'qrId']}
        visibleColumnIds={['createdAt', 'qrId', 'rrn']}
        onViewQr={onViewQr}
        onViewDetails={onViewDetails}
      />,
    )

    expect(cellTexts(html, 'th')).toEqual(['RRN', 'Yaratilgan vaqt', 'QR ID', 'Amallar'])
    expect(cellTexts(html, 'td')).toEqual(['RRN-1', '17.09.2026 10:20', 'qr-row-1', ''])
  })
})
