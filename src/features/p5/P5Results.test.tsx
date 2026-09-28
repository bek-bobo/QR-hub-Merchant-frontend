import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { safeContractError } from '@/shared/api/errors'
import type { Page } from '@/shared/contracts/merchant-read'
import type { P5Row } from '@/shared/contracts/p5-read'
import { P5Results } from './P5Results'

const row: P5Row = {
  deviceId: '00AbC-9', description: null, deviceStatus: 777, terminalId: 'terminal-a',
  terminalName: 'Terminal A', terminalType: 'P5', merchantName: 'Merchant A',
  staticQrId: 'qr-1', staticQrLink: 'https://example.test/secret', staticQrStatus: 0,
  createdAt: '2026-09-23T14:05:06',
}
const data: Page<P5Row> = { content: [row, row], totalElements: 19, totalPages: 2, page: 0, size: 10 }
const render = (overrides: Partial<Parameters<typeof P5Results>[0]> = {}) => renderToString(createElement(P5Results, {
  blocked: false, pending: false, error: null, data, selected: null,
  onRetry: () => undefined, onPageChange: () => undefined, onSelect: () => undefined,
  ...overrides,
}))

describe('P5 results', () => {
  it('preserves server rows/order/metadata and renders neutral data without static QR actions', () => {
    const html = render().replace(/<!-- -->/g, '')
    expect(html.match(/00AbC-9/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html).toContain('Holat noma’lum')
    expect(html).not.toContain('Holat: 777')
    expect(html).toContain('23.09.2026 14:05')
    expect(html).toContain('19 ta qurilma')
    expect(html).toContain('1 / 2')
    expect(html).toContain('>—<')
    expect(html).not.toContain('https://example.test/secret')
    expect(html).not.toContain('<a')
    expect(html).not.toContain('QR preview')
    expect(html).toContain('PIN reset')
    expect(html).not.toContain('yangi PIN')
  })

  it('shows confirmed status zero as active without changing reset availability rules', () => {
    const html = render({ data: { ...data, content: [{ ...row, deviceStatus: 0 }] }, resetAvailable: true })
    expect(html).toContain('>Faol<')
    expect(html).not.toContain('Faol (0)')
    expect(html).not.toContain('>0<')
    expect(html).toContain('>PIN reset</button>')
  })

  it('does not sort rows on the client', () => {
    const second = { ...row, deviceId: 'aa-second', description: 'Second' }
    const first = { ...row, deviceId: 'zz-first', description: 'First' }
    const html = render({ data: { ...data, content: [first, second] } })
    expect(html.indexOf('zz-first')).toBeLessThan(html.indexOf('aa-second'))
  })

  it('keeps loading, empty, read error, contract error and blocked filter distinct', () => {
    expect(render({ pending: true, data: undefined })).toContain('yuklanmoqda')
    expect(render({ data: { ...data, content: [], totalElements: 0, totalPages: 0 } })).toContain('P5 qurilmasi topilmadi')
    expect(render({ error: new Error('network'), data: undefined })).toContain('Qayta urinish')
    expect(render({ error: safeContractError(), data: undefined })).toContain('javobi kutilgan formatga mos emas')
    expect(render({ blocked: true })).not.toContain('00AbC-9')
  })
})
