import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { safeContractError } from '@/shared/api/errors'
import type { Page } from '@/shared/contracts/merchant-read'
import type { P5Row } from '@/shared/contracts/p5-read'
import { P5_DEFAULT_COLUMN_ORDER } from './columns'
import { P5Results } from './P5Results'

const row: P5Row = {
  deviceId: '00AbC-9', description: null, deviceStatus: 777, terminalId: 'terminal-a',
  terminalName: 'Terminal A', terminalType: 'P5', merchantName: 'Merchant A',
  staticQrId: 'qr-1', staticQrLink: 'https://example.test/secret', staticQrStatus: 0,
  createdAt: '2026-09-23T14:05:06',
}
const data: Page<P5Row> = { content: [row, row], totalElements: 19, totalPages: 2, page: 0, size: 20 }
const render = (overrides: Partial<Parameters<typeof P5Results>[0]> = {}) => renderToString(createElement(P5Results, {
  blocked: false, pending: false, error: null, data, selected: null,
  columnOrder: P5_DEFAULT_COLUMN_ORDER, visibleColumnIds: P5_DEFAULT_COLUMN_ORDER,
  onRetry: () => undefined, onPageChange: () => undefined, onSelect: () => undefined,
  ...overrides,
}))

function cellTexts(html: string, tag: 'th' | 'td'): string[] {
  return Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'g')))
    .map((match) => match[1]?.replace(/<[^>]+>/g, '').replace(/<!-- -->/g, '') ?? '')
}

describe('P5 results', () => {
  it('preserves server rows/order/metadata and renders neutral data without static QR actions', () => {
    const html = render().replace(/<!-- -->/g, '')
    expect(html.match(/00AbC-9/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html).toContain('Holat noma’lum')
    expect(html).not.toContain('Holat: 777')
    expect(html).toContain('23.09.2026 14:05')
    expect(html).not.toContain('Jami: 19')
    expect(html).toContain('aria-current="page"')
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

  it('presents unavailable PIN reset guidance as an accessible compact tooltip', () => {
    const html = render({
      data: { ...data, content: [{ ...row, deviceStatus: 0 }] },
      resetUnavailableMessage: 'PIN reset funksiyasi hozir mavjud emas.',
    })
    expect(html).toContain('aria-label="PIN reset haqida ma’lumot"')
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('PIN reset funksiyasi hozir mavjud emas.')
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

  it('renders default business columns around fixed operational source slots', () => {
    expect(cellTexts(render({ data: { ...data, content: [row] } }), 'th')).toEqual([
      'Tanlash', 'Qurilma ID', 'Tavsif', 'Terminal', 'Merchant', 'Qurilma holati',
      'PIN reset', 'Yaratilgan vaqt',
    ])
  })

  it('respects business order while preserving selection and PIN reset controls', () => {
    const activeRow = { ...row, description: 'Device description', deviceStatus: 0 }
    const html = render({
      data: { ...data, content: [activeRow] },
      columnOrder: ['merchant', 'terminal', 'deviceId', 'status', 'description', 'createdAt'],
      resetAvailable: true,
    })
    expect(cellTexts(html, 'th')).toEqual([
      'Tanlash', 'Merchant', 'Terminal', 'Qurilma ID', 'Qurilma holati', 'Tavsif',
      'PIN reset', 'Yaratilgan vaqt',
    ])
    expect(cellTexts(html, 'td')).toEqual([
      'Tanlash', 'Merchant A', 'Terminal Aterminal-a', '00AbC-9', 'Faol',
      'Device description', 'PIN reset', '23.09.2026 14:05',
    ])
    expect(html).toContain('aria-label="00AbC-9 qurilmasini tanlash"')
    expect(html).toContain('>PIN reset</button>')
  })

  it('hides and restores a business column without affecting operational controls', () => {
    const columnOrder = ['merchant', 'terminal', 'deviceId', 'status', 'description', 'createdAt'] as const
    expect(cellTexts(render({
      data: { ...data, content: [{ ...row, description: 'Device description' }] },
      columnOrder,
      visibleColumnIds: ['merchant', 'terminal', 'deviceId', 'status', 'createdAt'],
    }), 'th')).toEqual([
      'Tanlash', 'Merchant', 'Terminal', 'Qurilma ID', 'Qurilma holati', 'PIN reset',
      'Yaratilgan vaqt',
    ])
    expect(cellTexts(render({
      data: { ...data, content: [{ ...row, description: 'Device description' }] },
      columnOrder,
      visibleColumnIds: columnOrder,
    }), 'th')).toEqual([
      'Tanlash', 'Merchant', 'Terminal', 'Qurilma ID', 'Qurilma holati', 'Tavsif',
      'PIN reset', 'Yaratilgan vaqt',
    ])
  })

  it('keeps the scroll owner and fixed controls reachable with one business column', () => {
    const html = render({
      data: { ...data, content: [{ ...row, deviceStatus: 0 }] },
      visibleColumnIds: ['deviceId'],
      resetAvailable: true,
    })
    const scrollRegion = html.match(/<div[^>]*role="region"[^>]*aria-label="P5 qurilmalari jadvali"[^>]*>/)?.[0]
    expect(scrollRegion).toContain('overflow-x-auto')
    expect(cellTexts(html, 'th')).toEqual(['Tanlash', 'Qurilma ID', 'PIN reset'])
    expect(html).toContain('qurilmasini tanlash')
    expect(html).toContain('>PIN reset</button>')
  })
})
