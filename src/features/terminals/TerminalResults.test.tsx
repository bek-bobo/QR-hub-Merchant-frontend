import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Page } from '@/shared/contracts/merchant-read'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { TerminalResults } from './TerminalResults'

const row: TerminalRow = { id: 't-1', name: 'Terminal A', merchantId: '2', merchantName: 'Merchant A', bankAccountId: '3', bankAccountName: 'Bank A', statusCode: 777, terminalType: null, address: null, regionName: null, districtName: null }
const data: Page<TerminalRow> = { content: [row, row], totalElements: 47, totalPages: 5, page: 0, size: 10 }
const render = (overrides: Partial<Parameters<typeof TerminalResults>[0]> = {}) => renderToString(createElement(TerminalResults, { data, pending: false, error: false, blocked: false, onRetry: () => undefined, onPageChange: () => undefined, ...overrides }))

describe('terminal results', () => {
  it('preserves duplicate rows, raw unknown status, and authoritative total', () => {
    const html = render()
    const normalizedHtml = html.replace(/<!-- -->/g, '')
    expect(html.match(/Terminal A/g)).toHaveLength(2)
    expect(html).toContain('>777<')
    expect(normalizedHtml).toContain('47 ta terminal')
    expect(normalizedHtml).toContain('1 / 5')
    expect(html).not.toContain('Nusxalash')
    expect(html).not.toContain('Muvaffaqiyatli')
  })
  it('keeps blocked, loading, error and empty distinct from stale data', () => {
    expect(render({ blocked: true })).not.toContain('Terminal A')
    expect(render({ pending: true, data: undefined })).toContain('yuklanmoqda')
    expect(render({ error: true, data: undefined })).toContain('Qayta urinish')
    expect(render({ data: { ...data, content: [], totalElements: 0, totalPages: 0 } })).toContain('Terminal topilmadi')
  })
})
