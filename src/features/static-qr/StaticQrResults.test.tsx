import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Page } from '@/shared/contracts/merchant-read'
import type { StaticQrRow } from './contract'
import { StaticQrResults } from './StaticQrResults'

const data: Page<StaticQrRow> = {
  content: [
    { id: 'QR-1', terminalType: null, terminalId: null, terminalName: 'Terminal A',
      merchantId: null, merchantName: 'Merchant A', redirectUrl: null, minAmount: null,
      maxAmount: null, statusCode: 0, link: null, districtId: null, districtName: null,
      regionId: null, regionName: null, createdAt: null, updatedAt: null },
    { id: 'QR-2', terminalType: null, terminalId: null, terminalName: 'Terminal B',
      merchantId: null, merchantName: 'Merchant B', redirectUrl: null, minAmount: null,
      maxAmount: null, statusCode: 777, link: null, districtId: null, districtName: null,
      regionId: null, regionName: null, createdAt: null, updatedAt: null },
  ],
  totalElements: 2, totalPages: 2, page: 0, size: 20,
}

function resultProps(overrides: Partial<Parameters<typeof StaticQrResults>[0]> = {}) {
  return {
    terminalConfirmed: true, pending: false, error: false, data, page: 0,
    onRetry: () => undefined, onPageChange: () => undefined, ...overrides,
  }
}

function render(overrides: Partial<Parameters<typeof StaticQrResults>[0]> = {}) {
  return renderToString(createElement(StaticQrResults, resultProps(overrides)))
}

describe('static QR result presentation', () => {
  it('shows human-readable active and unknown statuses without raw codes or actions', () => {
    const html = render()
    expect(html).toContain('scope="col"')
    expect(html).toContain('>Faol<')
    expect(html).toContain('>Noma’lum<')
    expect(html).not.toContain('>0<')
    expect(html).not.toContain('>777<')
    expect(html).not.toContain('Muvaffaqiyatli')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('Nusxalash')
    expect(data.content.map((row) => row.statusCode)).toEqual([0, 777])
  })

  it('keeps loading, error, malformed and empty outcomes distinct', () => {
    expect(render({ pending: true, data: undefined })).toContain('Statik QRlar yuklanmoqda')
    expect(render({ pending: true, data: undefined })).not.toContain('Statik QR topilmadi')
    expect(render({ error: true, data: undefined })).toContain('Ma’lumotni yuklab bo‘lmadi')
    expect(render({ error: true, data: undefined })).not.toContain('Statik QR topilmadi')
    expect(render({ data: undefined })).toContain('Statik QR ro‘yxatini ko‘rsatib bo‘lmadi')
    expect(render({ data: undefined })).not.toContain('Statik QR topilmadi')
    expect(render({ data: { ...data, content: [], totalElements: 0, totalPages: 0 } }))
      .toContain('Statik QR topilmadi')
  })

  it('hides prior data and pagination when the applied terminal is unconfirmed', () => {
    const html = render({ terminalConfirmed: false })
    expect(html).toContain('Tanlangan terminal endi tasdiqlanmadi')
    expect(html).not.toContain('QR-1')
    expect(html).not.toContain('Statik QR sahifalari')
  })

  it('uses accessible, bounded pagination without visible total text', () => {
    const first = render()
    expect(first).toContain('aria-label="Oldingi sahifa" disabled=""')
    expect(first).toContain('aria-label="Keyingi sahifa"')
    expect(first.replace(/<!-- -->/g, '')).not.toContain('Jami: 2')
    expect(first).toContain('aria-current="page"')
    expect(first).toContain('>1</button>')
    const last = render({ page: 1, data: { ...data, page: 1 } })
    expect(last).toContain('aria-label="Keyingi sahifa" disabled=""')
    expect(last).toContain('>2</button>')
  })
})
