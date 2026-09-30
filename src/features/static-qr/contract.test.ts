import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { decodeStaticQrPage } from './contract'
import { renderToString } from 'react-dom/server'
import { StaticQrTable } from './StaticQrTable'

describe('static QR page contract', () => {
  it('keeps confirmed list fields and exact page metadata', () => {
    expect(decodeStaticQrPage({ success: true, data: {
      content: [{
        id: 'QR-1', terminalType: 'WEB', terminalId: 'terminal-1', terminalName: 'A',
        merchantId: 42, merchantName: 'M', redirectUrl: 'https://merchant.example/return',
        minAmount: 1000, maxAmount: '250000', status: 777,
        link: 'https://pay.example/QR-1?value=Exact', districtId: 7,
        districtName: 'Tuman', regionId: 8, regionName: 'Viloyat',
        createdAt: '2026-09-30T10:15:20', updatedAt: null,
      }],
      totalElements: 1, totalPages: 1, page: 0, size: 10,
    } })).toEqual({ content: [{
      id: 'QR-1', terminalType: 'WEB', terminalId: 'terminal-1', terminalName: 'A',
      merchantId: '42', merchantName: 'M', redirectUrl: 'https://merchant.example/return',
      minAmount: 1000, maxAmount: '250000', statusCode: 777,
      link: 'https://pay.example/QR-1?value=Exact', districtId: '7',
      districtName: 'Tuman', regionId: '8', regionName: 'Viloyat',
      createdAt: '2026-09-30T10:15:20', updatedAt: null,
    }],
      totalElements: 1, totalPages: 1, page: 0, size: 10 })
  })
  it('rejects missing page rather than showing an empty list', () => {
    expect(() => decodeStaticQrPage({ success: true, data: null })).toThrow()
  })

  it('fails closed on malformed page metadata and item fields', () => {
    const valid = { success: true, data: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 } }
    for (const data of [
      { ...valid.data, content: null }, { ...valid.data, page: -1 },
      { ...valid.data, totalElements: -1 }, { ...valid.data, size: 0 },
      { ...valid.data, content: [{ id: 12, terminalName: 'A', merchantName: 'M', status: 1 }] },
      { ...valid.data, content: [{ id: 'QR', terminalName: 'A', merchantName: 'M', status: '1' }] },
    ]) expect(() => decodeStaticQrPage({ success: true, data })).toThrow()
  })

  it('keeps server order and raw status data while presenting safe labels without unverified links', () => {
    const decoded = decodeStaticQrPage({ success: true, data: {
      content: [
        { id: 'QR-B', terminalName: 'B', merchantName: 'M', status: 50,
          link: 'https://example.test/unverified', redirectUrl: 'https://example.test/redirect' },
        { id: 'QR-A', terminalName: 'A', merchantName: 'M', status: 0 },
      ], totalElements: 2, totalPages: 1, page: 0, size: 10,
    } })
    expect(decoded.content.map((row) => row.id)).toEqual(['QR-B', 'QR-A'])
    const html = renderToString(createElement(StaticQrTable, { rows: decoded.content,
      onViewQr: () => undefined, onViewDetails: () => undefined }))
    expect(html.indexOf('QR-B')).toBeLessThan(html.indexOf('QR-A'))
    expect(decoded.content.map((row) => row.statusCode)).toEqual([50, 0])
    expect(html).toContain('>Noma’lum<')
    expect(html).toContain('>Faol<')
    expect(html).not.toContain('>50<')
    expect(html).not.toContain('>0<')
    expect(html).not.toContain('Muvaffaqiyatli')
    expect(html).not.toContain('example.test')
    expect(html).toContain('aria-label="Amallarni ochish"')
    expect(html).toContain('>Amallar<')
    expect(html.indexOf('>Holat<')).toBeLessThan(html.indexOf('>Amallar<'))
    expect(html).not.toContain('<a ')
    expect(html).toContain('scope="col"')
  })

  it('degrades malformed optional details to null without losing a valid list row', () => {
    const row = decodeStaticQrPage({ success: true, data: {
      content: [{ id: 'QR-1', terminalName: 'A', merchantName: 'M', status: 0,
        link: 1, redirectUrl: false, minAmount: 'NaN', districtId: {}, regionName: '', updatedAt: 'invalid' }],
      totalElements: 1, totalPages: 1, page: 0, size: 10,
    } }).content[0]

    expect(row).toMatchObject({ link: null, redirectUrl: null, minAmount: null, districtId: null,
      regionName: null, updatedAt: null })
  })
})
