import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { decodeBankAccountPage, type BankAccountRow } from '@/shared/contracts/management-read'
import type { Page } from '@/shared/contracts/merchant-read'
import { BankAccountResults } from './BankAccountResults'

const row: BankAccountRow = { id: '11', name: 'Main', bankName: 'Bank', accountNumber: '00000000000000000001', mfo: '00045', tin: '00123', contractNumber: '0007', merchantId: '2', merchantName: 'Merchant', statusCode: 777 }
const data: Page<BankAccountRow> = { content: [row, { ...row, id: '12', name: 'Second' }], totalElements: 47, totalPages: 5, page: 0, size: 20 }
const render = (overrides: Partial<Parameters<typeof BankAccountResults>[0]> = {}) => renderToString(createElement(BankAccountResults, { data, pending: false, error: false, blocked: false, onRetry: () => undefined, onPageChange: () => undefined, ...overrides }))

describe('bank-account results', () => {
  it('preserves source order, exact account text, and neutral fallback while hiding the visible total', () => {
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
})
