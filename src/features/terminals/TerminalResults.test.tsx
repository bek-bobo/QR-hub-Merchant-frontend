import { createElement } from 'react'
import { renderToString } from '@/test/locale-fixture'
import { describe, expect, it } from 'vitest'
import type { Page } from '@/shared/contracts/merchant-read'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { TERMINAL_DEFAULT_COLUMN_ORDER } from './columns'
import { TerminalResults } from './TerminalResults'

const row: TerminalRow = { id: 't-1', pkey: 't-1', name: 'Terminal A', merchantId: '2', merchantName: 'Merchant A', bankAccountId: '3', bankAccountName: 'Bank A', statusCode: 777, terminalType: null, address: null, regionName: null, districtName: null, mccCode: null, regionId: null, districtId: null, staticQrId: null, staticQrLink: null, phones: [], createdAt: null, updatedAt: null }
const data: Page<TerminalRow> = { content: [row, row], totalElements: 47, totalPages: 5, page: 0, size: 20 }
const render = (overrides: Partial<Parameters<typeof TerminalResults>[0]> = {}) => renderToString(createElement(TerminalResults, { data, pending: false, error: false, blocked: false, columnOrder: TERMINAL_DEFAULT_COLUMN_ORDER, visibleColumnIds: TERMINAL_DEFAULT_COLUMN_ORDER, onRetry: () => undefined, onPageChange: () => undefined, onViewQr: () => undefined, onViewDetails: () => undefined, ...overrides }))

function cellTexts(html: string, tag: 'th' | 'td'): string[] {
  return Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'g')))
    .map((match) => match[1]?.replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '') ?? '')
}

describe('terminal results', () => {
  it('places neutral quick filters and toolbar before the existing table and preserves pagination/actions', () => {
    const html = render({ quickFilters: createElement('input', { placeholder: 'Terminal nomi yoki ID' }),
      headerActions: createElement('button', {}, 'Filtrlar') })
    expect(html.indexOf('placeholder="Terminal nomi yoki ID"')).toBeLessThan(html.indexOf('>Filtrlar</button>'))
    expect(html.indexOf('>Filtrlar</button>')).toBeLessThan(html.indexOf('aria-label="Terminal jadvali"'))
    expect(html).toContain('aria-label="Amallarni ochish"')
    expect(html).toContain('aria-label="Terminal sahifalari"')
    expect(html).toContain('flex-wrap')
    expect(html).toContain('overflow-x-auto')
    expect(html).not.toContain('bg-red-')
    expect(html).not.toContain('>Terminallar<')
    expect(html).not.toContain('Terminallar ro‘yxati')
    expect(html).not.toContain('lucide-monitor')
    expect(html).not.toContain('data-slot="card-header"')
  })
  it('preserves duplicate rows, shows the server total and presents unknown status neutrally', () => {
    const html = render()
    const normalizedHtml = html.replace(/<!-- -->/g, '')
    expect(html.match(/Terminal A/g)).toHaveLength(2)
    expect(html.match(/>Noma’lum</g)).toHaveLength(2)
    expect(html).not.toContain('>777<')
    expect(normalizedHtml).not.toContain('Jami: 47')
    expect(normalizedHtml).toContain('Jami 47 ta Terminal')
    expect(html).toContain('aria-current="page"')
    expect(html).not.toContain('Nusxalash')
    expect(html).not.toContain('Muvaffaqiyatli')
    expect(data.content.map((item) => item.statusCode)).toEqual([777, 777])
  })
  it('presents confirmed status zero as active without exposing the raw code', () => {
    const html = render({ data: { ...data, content: [{ ...row, statusCode: 0 }] } })
    expect(html).toContain('>Faol<')
    expect(html).not.toContain('>0<')
  })
  it('keeps blocked, loading, error and empty distinct from stale data', () => {
    expect(render({ blocked: true })).not.toContain('Terminal A')
    expect(render({ pending: true, data: undefined })).toContain('yuklanmoqda')
    expect(render({ error: true, data: undefined })).toContain('Qayta urinish')
    expect(render({ data: { ...data, content: [], totalElements: 0, totalPages: 0 } })).toContain('Terminal topilmadi')
  })
  it('renders every default business column with fixed final actions', () => {
    expect(cellTexts(render({ data: { ...data, content: [row] } }), 'th')).toEqual([
      'Terminal ID', 'Merchant', 'Nomi', 'Bank hisobi', 'Holat', 'Amallar',
    ])
    expect(render()).toContain('aria-label="Amallarni ochish"')
    expect(render()).toContain('sticky right-0')
  })
  it('respects custom order for both headers and body cells', () => {
    const html = render({
      data: { ...data, content: [row] },
      columnOrder: ['merchant', 'name', 'terminalId', 'status', 'bankAccount'],
    })
    expect(cellTexts(html, 'th')).toEqual([
      'Merchant', 'Nomi', 'Terminal ID', 'Holat', 'Bank hisobi', 'Amallar',
    ])
    expect(cellTexts(html, 'td')).toEqual([
      'Merchant A', 'Terminal A', 't-1', 'Noma’lum', 'Bank A', '',
    ])
  })
  it('hides a column and restores it at its saved order position', () => {
    const columnOrder = ['merchant', 'name', 'terminalId', 'bankAccount', 'status'] as const
    expect(cellTexts(render({
      data: { ...data, content: [row] },
      columnOrder,
      visibleColumnIds: ['merchant', 'name', 'terminalId', 'status'],
    }), 'th')).toEqual(['Merchant', 'Nomi', 'Terminal ID', 'Holat', 'Amallar'])
    expect(cellTexts(render({
      data: { ...data, content: [row] },
      columnOrder,
      visibleColumnIds: columnOrder,
    }), 'th')).toEqual(['Merchant', 'Nomi', 'Terminal ID', 'Bank hisobi', 'Holat', 'Amallar'])
  })
})
