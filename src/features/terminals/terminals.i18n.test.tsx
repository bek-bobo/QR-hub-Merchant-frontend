// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { mountManagement } from '@/test/management-i18n-fixture'
import { createMessages } from '@/shared/i18n/messages'
import { decodeTerminalPage } from '@/shared/contracts/management-read'
import { createTerminalPresentation } from './presentation'
import { TerminalDetailsSheet } from './TerminalDetailsSheet'
import { TerminalResults } from './TerminalResults'
import { TERMINAL_DEFAULT_COLUMN_ORDER, createTerminalColumns } from './columns'

const data = decodeTerminalPage({ success: true, data: { content: [{ pkey: 'terminals.actions.details', name: '{{name}}', merchantId: 1, merchantName: 'Backend merchant', bankAccountId: 2, bankAccountName: 'Backend bank', status: 1, terminalType: 'OPAQUE', staticQrLink: 'https://example.test/pay?x=%2B', createdAt: '2026-10-09T23:59:00' }], totalElements: 1, totalPages: 1, page: 0, size: 20 } })
describe.each(['uz', 'ru', 'en'] as const)('Terminals %s', locale => {
  it('localizes table/details and keeps unverified status and opaque type/name/link literal', async () => {
    const view = await mountManagement(locale, <><TerminalResults blocked={false} pending={false} error={false} data={data} columnOrder={TERMINAL_DEFAULT_COLUMN_ORDER} visibleColumnIds={TERMINAL_DEFAULT_COLUMN_ORDER} onRetry={vi.fn()} onPageChange={vi.fn()} onViewQr={vi.fn()} onViewDetails={vi.fn()} /><TerminalDetailsSheet row={data.content[0]!} onOpenChange={vi.fn()} onViewQr={vi.fn()} /></>)
    try {
      const p = createTerminalPresentation(locale, createMessages(view.runtime, 'terminals'), createMessages(view.runtime, 'common'))
      expect(view.host.textContent).toContain(p.message('fields.name'))
      expect(document.body.textContent).toContain(p.message('details.title'))
      for (const literal of ['terminals.actions.details', '{{name}}', 'OPAQUE', 'https://example.test/pay?x=%2B']) expect(document.body.textContent).toContain(literal)
      expect(p.status(1).label).toBe(p.message('status.unknown')); expect(p.status(0).tone).toBe('success')
      expect(createTerminalColumns(p).map(column => column.id)).toEqual(TERMINAL_DEFAULT_COLUMN_ORDER)
    } finally { await view.dispose() }
  })
})
it('retains an open terminal dialog and focused control during language switching without invoking actions', async () => {
  const close = vi.fn(), qr = vi.fn(), view = await mountManagement('uz', <TerminalDetailsSheet row={data.content[0]!} onOpenChange={close} onViewQr={qr} />)
  try {
    const dialog = document.querySelector('[role=dialog]'), button = document.querySelector<HTMLButtonElement>('[role=dialog] button')!
    await act(async () => button.focus()); await view.switchTo('ru'); await view.switchTo('en')
    expect(document.querySelector('[role=dialog]')).toBe(dialog); expect(document.activeElement).toBe(button)
    expect(document.body.textContent).toContain('Terminal details'); expect(close).not.toHaveBeenCalled(); expect(qr).not.toHaveBeenCalled()
  } finally { await view.dispose() }
})
