import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { decodeCashierPage, type CashierRow } from '@/shared/contracts/management-read'
import type { Page } from '@/shared/contracts/merchant-read'
import { CASHIER_DEFAULT_COLUMN_ORDER } from './columns'
import { CashierResults } from './CashierResults'

const cashier: CashierRow = { id: '11', fullname: 'Cashier A', phone: '+998900000001', statusCode: 777, roleDisplay: 'Merchant user', terminals: [{ id: 'term-active', name: 'Active Terminal', statusCode: 0 }, { id: 'term-second', name: 'Second Terminal', statusCode: 0 }] }
const page: Page<CashierRow> = { content: [cashier, { ...cashier, id: '12', fullname: 'Cashier B', terminals: [] }], totalElements: 47, totalPages: 5, page: 0, size: 20 }
const render = (overrides: Partial<Parameters<typeof CashierResults>[0]> = {}) => renderToString(createElement(CashierResults, { data: page, selected: null, blocked: false, pending: false, error: false, columnOrder: CASHIER_DEFAULT_COLUMN_ORDER, visibleColumnIds: CASHIER_DEFAULT_COLUMN_ORDER, onRetry: () => undefined, onPageChange: () => undefined, onSelect: () => undefined, onClose: () => undefined, ...overrides }))

function cellTexts(html: string, tag: 'th' | 'td'): string[] {
  return Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'g')))
    .map((match) => match[1]?.replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '') ?? '')
}

describe('cashier results', () => {
  it('preserves server rows even when filtered terminal is absent from active memberships', () => {
    const html = render({ selected: page.content[1] })
    const text = html.replace(/<!-- -->/g, '')
    expect(html.indexOf('Cashier A')).toBeLessThan(html.indexOf('Cashier B'))
    expect(html).toContain('Cashier B')
    expect(html).toContain('Terminal biriktirilmagan')
    expect(html).not.toContain('term-inactive-filter')
    expect(text).not.toContain('Jami: 47')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('>Noma’lum<')
    expect(html).not.toContain('>777<')
    expect(html).toContain('Merchant user')
    expect(html).not.toContain('Biriktirishni bekor qilish')
    expect(html).not.toContain('Kassir yaratish')
    expect(page.content.map((item) => item.statusCode)).toEqual([777, 777])
  })

  it('does not manufacture a terminal-filter match into decoded active memberships', () => {
    const decoded = decodeCashierPage({ success: true, data: { content: [{ id: 12, fullname: 'Cashier B', phone: '+998900000002', role: 'Merchant user', status: 777, terminals: [] }], totalElements: 1, totalPages: 1, page: 0, size: 10 } })
    expect(decoded.content).toHaveLength(1)
    expect(decoded.content[0].terminals).toEqual([])
    const html = render({ data: decoded, selected: decoded.content[0] })
    expect(html).toContain('Cashier B')
    expect(html).toContain('Terminal biriktirilmagan')
    expect(html).not.toContain('term-inactive-filter')
  })

  it('renders only the selected row active memberships in source order', () => {
    const html = render({ selected: cashier })
    expect(html.indexOf('Active Terminal')).toBeLessThan(html.indexOf('Second Terminal'))
    expect(html).toContain('term-active')
    expect(html).toContain('term-second')
    expect(html).toContain('aria-label="Faol terminal biriktirishlari"')
    expect(html.match(/>Faol</g)?.length).toBeGreaterThanOrEqual(2)
    expect(html).not.toContain('Status kodi: 0')
  })

  it('presents confirmed cashier status zero as active without exposing the raw code', () => {
    const html = render({ data: { ...page, content: [{ ...cashier, statusCode: 0 }] } })
    expect(html).toContain('>Faol<')
    expect(html).not.toContain('>0<')
  })

  it('places the optional assign surface only inside an open current membership panel', () => {
    expect(render({ assignSurface: createElement('button', { type: 'button' }, 'Terminallarni qo‘shish') })).not.toContain('Terminallarni qo‘shish')
    const html = render({ selected: cashier, assignSurface: createElement('button', { type: 'button' }, 'Terminallarni qo‘shish') })
    expect(html).toContain('Terminallarni qo‘shish')
    expect(html).not.toContain('Biriktirishni bekor qilish')
  })

  it('offers one unassign control per selected ACTIVE membership only when authorized by the caller', () => {
    expect(render({ selected: cashier })).not.toContain('terminalini ajratish')
    const html = render({ selected: cashier, onUnassign: () => undefined })
    expect(html).toContain('term-active) terminalini ajratish')
    expect(html).toContain('term-second) terminalini ajratish')
    expect(html).not.toContain('term-inactive-filter')
    expect(render({ selected: page.content[1], onUnassign: () => undefined })).not.toContain('terminalini ajratish')
    expect(render({ onUnassign: () => undefined })).not.toContain('terminalini ajratish')
  })

  it('keeps loading, empty, error and blocked states distinct', () => {
    expect(render({ pending: true, data: undefined })).toContain('yuklanmoqda')
    expect(render({ data: { ...page, content: [], totalElements: 0, totalPages: 0 } })).toContain('Kassir topilmadi')
    expect(render({ error: true, data: undefined })).toContain('Qayta urinish')
    expect(render({ blocked: true })).not.toContain('+998900000001')
  })

  it('rejects malformed required memberships instead of presenting an empty list', () => {
    expect(() => decodeCashierPage({ success: true, data: { content: [{ id: 11, fullname: 'Cashier A', phone: '+998900000001', status: 0, terminals: null }], totalElements: 1, totalPages: 1, page: 0, size: 10 } })).toThrow()
  })

  it('renders default business columns with Faol terminallar fixed final', () => {
    expect(cellTexts(render({ data: { ...page, content: [cashier] } }), 'th')).toEqual([
      'F.I.Sh.', 'Telefon', 'Rol', 'Holat', 'Faol terminallar',
    ])
  })

  it('respects business order while preserving the operational column and its control', () => {
    const html = render({
      data: { ...page, content: [cashier] },
      columnOrder: ['status', 'fullName', 'role', 'phone'],
    })
    expect(cellTexts(html, 'th')).toEqual([
      'Holat', 'F.I.Sh.', 'Rol', 'Telefon', 'Faol terminallar',
    ])
    expect(cellTexts(html, 'td')).toEqual([
      'Noma’lum', 'Cashier A', 'Merchant user', '+998900000001', 'Biriktirishlarni ko‘rish',
    ])
    expect(html).toContain('aria-label="Cashier A: Biriktirishlarni ko‘rish"')
  })

  it('hides and restores a business column without affecting Faol terminallar', () => {
    const columnOrder = ['status', 'fullName', 'role', 'phone'] as const
    expect(cellTexts(render({
      data: { ...page, content: [cashier] },
      columnOrder,
      visibleColumnIds: ['status', 'fullName', 'role'],
    }), 'th')).toEqual(['Holat', 'F.I.Sh.', 'Rol', 'Faol terminallar'])
    expect(cellTexts(render({
      data: { ...page, content: [cashier] },
      columnOrder,
      visibleColumnIds: columnOrder,
    }), 'th')).toEqual(['Holat', 'F.I.Sh.', 'Rol', 'Telefon', 'Faol terminallar'])
  })

  it('keeps the table scroll owner and operational control reachable with one business column', () => {
    const html = render({
      data: { ...page, content: [cashier] },
      visibleColumnIds: ['fullName'],
    })
    const scrollRegion = html.match(/<div[^>]*role="region"[^>]*aria-label="Kassirlar jadvali"[^>]*>/)?.[0]
    expect(scrollRegion).toContain('overflow-x-auto')
    expect(cellTexts(html, 'th')).toEqual(['F.I.Sh.', 'Faol terminallar'])
    expect(html).toContain('Biriktirishlarni ko‘rish')
  })
})
