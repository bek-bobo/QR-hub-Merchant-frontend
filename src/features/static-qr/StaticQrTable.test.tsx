import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StaticQrRow } from './contract'
import { STATIC_QR_DEFAULT_COLUMN_ORDER } from './columns'
import { StaticQrTable } from './StaticQrTable'

const row: StaticQrRow = {
  id: 'STATIC-QR-1',
  terminalType: 'WEB',
  terminalId: 'terminal-1',
  terminalName: 'Terminal A',
  merchantId: '42',
  merchantName: 'Merchant A',
  redirectUrl: null,
  minAmount: null,
  maxAmount: null,
  statusCode: 0,
  link: 'https://pay.example/STATIC-QR-1',
  districtId: null,
  districtName: null,
  regionId: null,
  regionName: null,
  createdAt: null,
  updatedAt: null,
}

function cellTexts(html: string, tag: 'th' | 'td'): string[] {
  return Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'g')))
    .map((match) => match[1]?.replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '') ?? '')
}

function render(
  columnOrder: readonly string[] = STATIC_QR_DEFAULT_COLUMN_ORDER,
  visibleColumnIds: readonly string[] = STATIC_QR_DEFAULT_COLUMN_ORDER,
) {
  return renderToStaticMarkup(
    <StaticQrTable
      rows={[row]}
      columnOrder={columnOrder}
      visibleColumnIds={visibleColumnIds}
      onViewQr={() => undefined}
      onViewDetails={() => undefined}
    />,
  )
}

describe('StaticQrTable column preferences', () => {
  it('renders every default business column with fixed Amallar final', () => {
    expect(cellTexts(render(), 'th')).toEqual([
      'QR ID', 'Terminal', 'Merchant', 'Holat', 'Amallar',
    ])
  })

  it('respects saved order for both headers and body cells', () => {
    const html = render(['merchant', 'status', 'qrId', 'terminal'])
    expect(cellTexts(html, 'th')).toEqual(['Merchant', 'Holat', 'QR ID', 'Terminal', 'Amallar'])
    expect(cellTexts(html, 'td')).toEqual([
      'Merchant A', 'Faol', 'STATIC-QR-1', 'Terminal A', '',
    ])
  })

  it('hides business columns and restores them at their saved order position', () => {
    const order = ['merchant', 'qrId', 'terminal', 'status'] as const
    expect(cellTexts(render(order, ['merchant', 'qrId', 'status']), 'th'))
      .toEqual(['Merchant', 'QR ID', 'Holat', 'Amallar'])
    expect(cellTexts(render(order, ['merchant', 'qrId', 'terminal', 'status']), 'th'))
      .toEqual(['Merchant', 'QR ID', 'Terminal', 'Holat', 'Amallar'])
  })

  it('keeps Amallar visible and final for a reduced business-column set', () => {
    const html = render(['status', 'merchant', 'terminal', 'qrId'], ['status'])
    expect(cellTexts(html, 'th')).toEqual(['Holat', 'Amallar'])
    expect(html).toContain('aria-label="Amallarni ochish"')
  })
})
