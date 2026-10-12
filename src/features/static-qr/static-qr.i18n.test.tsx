// @vitest-environment happy-dom
import { act, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { mountManagement } from '@/test/management-i18n-fixture'
import { createMessages } from '@/shared/i18n/messages'
import { createStaticQrPresentation } from './presentation'
import { StaticQrDetailsSheet } from './StaticQrDetailsSheet'
import { StaticQrTable } from './StaticQrTable'
import { StaticQrQuickSearch } from './StaticQrFilterControls'
import { STATIC_QR_DEFAULT_COLUMN_ORDER, createStaticQrColumns } from './columns'
import { decodeStaticQrPage } from './contract'

const row = decodeStaticQrPage({ success: true, data: { content: [{ id: 'staticQr.actions.details', terminalName: '{{name}}', merchantName: 'Backend merchant', status: 1, link: 'https://example.test/pay?x=%2B', minAmount: '900719925474099301', createdAt: '2026-10-09T23:59:00' }], totalElements: 1, totalPages: 1, page: 0, size: 20 } }).content[0]!
describe.each(['uz', 'ru', 'en'] as const)('Static QR %s', locale => {
  it('localizes real columns, filters and details while preserving raw values and active-only status meaning', async () => {
    const view = await mountManagement(locale, <><StaticQrQuickSearch searchDraft="RAW" onDraftChange={vi.fn()} /><StaticQrTable rows={[row]} columnOrder={STATIC_QR_DEFAULT_COLUMN_ORDER} visibleColumnIds={STATIC_QR_DEFAULT_COLUMN_ORDER} onViewQr={vi.fn()} onViewDetails={vi.fn()} /><StaticQrDetailsSheet row={row} onOpenChange={vi.fn()} onViewQr={vi.fn()} /></>)
    try {
      const p = createStaticQrPresentation(locale, createMessages(view.runtime, 'staticQr'), createMessages(view.runtime, 'common'))
      expect(view.host.textContent).toContain(p.message('fields.status'))
      expect(document.body.textContent).toContain(p.message('details.title'))
      expect(document.body.textContent).toContain('900719925474099301')
      expect(document.body.textContent).toContain(row.id)
      expect(document.body.textContent).toContain('{{name}}')
      if (locale === 'uz') {
        expect(document.body.textContent).toContain('Yo‘naltirish URL manzili')
        expect(document.body.textContent).toContain('Holat kodi')
        expect(document.body.textContent).not.toContain('Redirect URL')
        expect(document.body.textContent).not.toContain('Status code')
      }
      expect(p.status(1).label).toBe(p.message('status.unknown'))
      expect(p.status(50).label).toBe(p.message('status.unknown'))
      expect(p.status(0).tone).toBe('success')
      expect(createStaticQrColumns(p).map(column => column.id)).toEqual(STATIC_QR_DEFAULT_COLUMN_ORDER)
      expect(p.wallTime(row.createdAt!)).toContain('23:59')
    } finally { await view.dispose() }
  })
})
it('keeps a mounted details dialog, raw QR link and unfinished search/focus across language changes', async () => {
  const close = vi.fn(), qr = vi.fn()
  function Fixture() { const [search, setSearch] = useState('literal draft'); return <><StaticQrQuickSearch searchDraft={search} onDraftChange={setSearch} /><StaticQrDetailsSheet row={row} onOpenChange={close} onViewQr={qr} /></> }
  const view = await mountManagement('uz', <Fixture />)
  try {
    const dialog = document.querySelector('[role=dialog]'), input = view.host.querySelector<HTMLInputElement>('input')!
    const focused = document.querySelector<HTMLButtonElement>('[role=dialog] button')!
    await act(async () => focused.focus())
    await view.switchTo('ru'); await view.switchTo('en')
    expect(document.querySelector('[role=dialog]')).toBe(dialog)
    expect(document.activeElement).toBe(focused)
    expect(input.value).toBe('literal draft')
    expect(document.body.textContent).toContain('Static QR details')
    expect(document.body.textContent).toContain(row.link)
    expect(close).not.toHaveBeenCalled(); expect(qr).not.toHaveBeenCalled()
  } finally { await view.dispose() }
})
