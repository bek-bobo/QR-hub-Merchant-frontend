import { createElement } from 'react'
import { renderToString } from '@/test/locale-fixture'
import { describe, expect, it } from 'vitest'
import { decodeBankAccountPage, type BankAccountRow } from '@/shared/contracts/management-read'
import type { Page } from '@/shared/contracts/merchant-read'
import { BANK_ACCOUNT_DEFAULT_COLUMN_ORDER } from './columns'
import { BankAccountResults } from './BankAccountResults'

const row: BankAccountRow = { id: '11', name: 'Main', bankName: 'Bank', accountNumber: '00000000000000000001', mfo: '00045', tin: '00123', contractNumber: '0007', merchantId: '2', merchantName: 'Merchant', statusCode: 777 }
const data: Page<BankAccountRow> = { content: [row, { ...row, id: '12', name: 'Second' }], totalElements: 47, totalPages: 5, page: 0, size: 20 }
const render = (overrides: Partial<Parameters<typeof BankAccountResults>[0]> = {}) => renderToString(createElement(BankAccountResults, { data, pending: false, error: false, blocked: false, columnOrder: BANK_ACCOUNT_DEFAULT_COLUMN_ORDER, visibleColumnIds: BANK_ACCOUNT_DEFAULT_COLUMN_ORDER, onRetry: () => undefined, onPageChange: () => undefined, ...overrides }))

function cellTexts(html: string, tag: 'th' | 'td'): string[] {
  return Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'g')))
    .map((match) => match[1]?.replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '') ?? '')
}

describe('bank-account results', () => {
  it('keeps quick search and toolbar actions above the existing table and available during loading', () => {
    const controls = {
      quickFilters: createElement('input', { type: 'search', placeholder: 'quick-search' }),
      headerActions: createElement('button', { type: 'button' }, 'toolbar-actions'),
    }
    const html = render(controls)
    expect(html.indexOf('placeholder="quick-search"')).toBeLessThan(html.indexOf('toolbar-actions'))
    expect(html.indexOf('toolbar-actions')).toBeLessThan(html.indexOf('aria-label="Bank hisoblari jadvali"'))
    expect(html).toContain('00000000000000000001')
    const pending = render({ ...controls, pending: true, data: undefined })
    expect(pending).toContain('placeholder="quick-search"')
    expect(pending).toContain('toolbar-actions')
    expect(pending).toContain('yuklanmoqda')
  })
  it('preserves source order, exact account text, neutral fallback and the server total', () => {
    const html = render()
    const text = html.replace(/<!-- -->/g, '')
    expect(html.indexOf('Main')).toBeLessThan(html.indexOf('Second'))
    expect(html).toContain('00000000000000000001')
    expect(html).toContain('00045')
    expect(html).toContain('00123')
    expect(html).toContain('0007')
    expect(html.match(/>Noma’lum</g)).toHaveLength(2)
    expect(html).not.toContain('>777<')
    expect(text).not.toContain('Jami: 47')
    expect(text).toContain('Jami 47 ta Bank hisoblari')
    expect(html).toContain('aria-current="page"')
    expect(html).not.toContain('Balans')
    expect(html).not.toContain('Muvaffaqiyatli')
    expect(data.content.map((item) => item.statusCode)).toEqual([777, 777])
  })

  it('presents confirmed status zero as active without exposing the raw code', () => {
    const html = render({ data: { ...data, content: [{ ...row, statusCode: 0 }] } })
    expect(html).toContain('>Faol<')
    expect(html).not.toContain('>0<')
  })

  it('keeps nullable optional fields safe and blocked/error/empty distinct', () => {
    expect(render({ data: { ...data, content: [{ ...row, mfo: null, tin: null, contractNumber: null }] } })).toContain('—')
    expect(render({ blocked: true })).not.toContain('00000000000000000001')
    expect(render({ pending: true, data: undefined })).toContain('yuklanmoqda')
    expect(render({ error: true, data: undefined })).toContain('Qayta urinish')
    expect(render({ data: { ...data, content: [], totalElements: 0, totalPages: 0 } })).toContain('Bank hisobi topilmadi')
    expect(() => decodeBankAccountPage({ success: true, data: { ...data, content: [{ id: 11, name: 'Main', bankName: 'Bank', bankAccount: 42, merchantId: 2, merchantName: 'Merchant', status: 777 }] } })).toThrow()
  })

  it('renders every default business column without an operational column', () => {
    expect(cellTexts(render({ data: { ...data, content: [row] } }), 'th')).toEqual([
      'Nomi', 'Bank', 'Hisob raqami', 'Merchant', 'MFO', 'STIR', 'Shartnoma', 'Holat',
    ])
  })

  it('respects custom order for headers and unchanged row presentations', () => {
    const html = render({
      data: { ...data, content: [row] },
      columnOrder: ['status', 'merchant', 'name', 'accountNumber', 'bank', 'stir', 'mfo', 'contract'],
    })
    expect(cellTexts(html, 'th')).toEqual([
      'Holat', 'Merchant', 'Nomi', 'Hisob raqami', 'Bank', 'STIR', 'MFO', 'Shartnoma',
    ])
    expect(cellTexts(html, 'td')).toEqual([
      'Noma’lum', 'Merchant', 'Main', '00000000000000000001', 'Bank', '00123', '00045', '0007',
    ])
  })

  it('hides a column and restores it at its saved order position', () => {
    const columnOrder = ['status', 'merchant', 'name', 'accountNumber', 'bank', 'stir', 'mfo', 'contract'] as const
    expect(cellTexts(render({
      data: { ...data, content: [row] },
      columnOrder,
      visibleColumnIds: ['status', 'merchant', 'name', 'accountNumber', 'bank', 'mfo', 'contract'],
    }), 'th')).toEqual([
      'Holat', 'Merchant', 'Nomi', 'Hisob raqami', 'Bank', 'MFO', 'Shartnoma',
    ])
    expect(cellTexts(render({
      data: { ...data, content: [row] },
      columnOrder,
      visibleColumnIds: columnOrder,
    }), 'th')).toEqual([
      'Holat', 'Merchant', 'Nomi', 'Hisob raqami', 'Bank', 'STIR', 'MFO', 'Shartnoma',
    ])
  })

  it('keeps the wide table scroll region as the overflow owner', () => {
    const html = render({ data: { ...data, content: [row] } })
    const scrollRegion = html.match(/<div[^>]*role="region"[^>]*aria-label="Bank hisoblari jadvali"[^>]*>/)?.[0]
    expect(scrollRegion).toContain('overflow-x-auto')
    const tableInRegion = html.match(/<div[^>]*role="region"[^>]*aria-label="Bank hisoblari jadvali"[^>]*>[\s\S]*?(<table\b[^>]*>)/)?.[1]
    expect(tableInRegion).toBeDefined()
    const minimumWidth = tableInRegion?.match(/\bstyle="[^"]*\bmin-width:([\d.]+)px(?:;|")/)?.[1]
    expect(minimumWidth).toBeDefined()
    expect(Number(minimumWidth)).toBeGreaterThan(0)
  })
})
