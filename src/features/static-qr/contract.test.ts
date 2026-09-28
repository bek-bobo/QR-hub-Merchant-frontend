import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { decodeStaticQrPage } from './contract'
import { renderToString } from 'react-dom/server'
import { StaticQrTable } from './StaticQrTable'

describe('static QR page contract', () => {
  it('keeps confirmed list fields and exact page metadata', () => {
    expect(decodeStaticQrPage({ success: true, data: {
      content: [{ id: 'QR-1', terminalName: 'A', merchantName: 'M', status: 777, link: 'unverified' }],
      totalElements: 1, totalPages: 1, page: 0, size: 10,
    } })).toEqual({ content: [{ id: 'QR-1', terminalName: 'A', merchantName: 'M', statusCode: 777 }],
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

  it('keeps server order and neutral numeric status without exposing unverified links', () => {
    const decoded = decodeStaticQrPage({ success: true, data: {
      content: [
        { id: 'QR-B', terminalName: 'B', merchantName: 'M', status: 50,
          link: 'https://example.test/unverified', redirectUrl: 'https://example.test/redirect' },
        { id: 'QR-A', terminalName: 'A', merchantName: 'M', status: 0 },
      ], totalElements: 2, totalPages: 1, page: 0, size: 10,
    } })
    expect(decoded.content.map((row) => row.id)).toEqual(['QR-B', 'QR-A'])
    const html = renderToString(createElement(StaticQrTable, { rows: decoded.content }))
    expect(html.indexOf('QR-B')).toBeLessThan(html.indexOf('QR-A'))
    expect(html).toContain('>50<')
    expect(html).not.toContain('Muvaffaqiyatli')
    expect(html).not.toContain('example.test')
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('<a ')
    expect(html).toContain('scope="col"')
  })
})
