import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { CashierRow } from '@/shared/contracts/management-read'
import { CASHIER_DEFAULT_COLUMN_ORDER, cashierColumns } from './columns'
import { CashierResults } from './CashierResults'
import { CashierTerminalsContent, CashierTerminalsDialog } from './CashierTerminalsDialog'
import dialogSource from './CashierTerminalsDialog.tsx?raw'
import pageSource from './CashierPage.tsx?raw'

vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  const part = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { ...actual, Dialog: { ...actual.Dialog,
    Root: part, Portal: part, Overlay: part, Content: part, Title: part, Description: part, Close: part,
  } }
})

const cashier: CashierRow = {
  id: '41', fullname: 'Cashier A', phone: '998901234567', roleDisplay: 'User', statusCode: 0,
  createdAt: '2026-10-01T10:15:20', updatedAt: null,
  terminals: [
    { id: 'LONG-EXACT-ID-Case-00000000000000000001', name: 'Terminal Z', statusCode: 0 },
    { id: 'ID-02', name: 'Terminal A', statusCode: 1 },
    { id: 'ID-03', name: 'Terminal B', statusCode: 777 },
  ],
}

function results(row: CashierRow) {
  return renderToStaticMarkup(<CashierResults blocked={false} pending={false} error={false}
    data={{ content: [row], totalElements: 1, totalPages: 1, page: 0, size: 10 }} selected={null}
    columnOrder={CASHIER_DEFAULT_COLUMN_ORDER} visibleColumnIds={CASHIER_DEFAULT_COLUMN_ORDER}
    onRetry={() => undefined} onPageChange={() => undefined} onSelect={() => undefined} onClose={() => undefined} />)
}

describe('cashier terminal assignment modal', () => {
  it.each([0, 1, 3])('shows a compact accessible trigger for %i terminals, including zero', (count) => {
    const html = results({ ...cashier, terminals: cashier.terminals.slice(0, count) })
    expect(html).toContain(`Terminallar · ${count}`)
    expect(html).toContain('aria-label="Cashier A uchun biriktirilgan terminallarni ko‘rish"')
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).not.toContain('Biriktirishlarni ko‘rish')
    const trigger = html.match(/<button[^>]*aria-label="Cashier A uchun biriktirilgan terminallarni ko‘rish"[^>]*>/)?.[0]
    expect(trigger).toBeDefined()
    // Ignore quoted values so CSS variants cannot masquerade as HTML attributes.
    expect(trigger?.replace(/"[^"]*"|'[^']*'/g, '""')).not.toMatch(/\sdisabled(?:\s|=|\/?>)/i)
    expect(cashierColumns.some((column) => column.label === 'Faol terminallar')).toBe(false)
  })

  it('shows cashier context, every exact terminal ID, and statuses in source order', () => {
    const html = renderToStaticMarkup(<CashierTerminalsDialog cashier={cashier} onClose={() => undefined} />)
    expect(html).toContain('Biriktirilgan terminallar')
    expect(html).toContain('Cashier A')
    expect(html).toContain('+998 90 123 45 67')
    for (const terminal of cashier.terminals) {
      expect(html).toContain(terminal.name)
      expect(html).toContain(terminal.id)
      expect(html).toContain(`title="${terminal.id}"`)
    }
    expect(html.indexOf('Terminal Z')).toBeLessThan(html.indexOf('Terminal A'))
    expect(html.indexOf('Terminal A')).toBeLessThan(html.indexOf('Terminal B'))
    expect(html).toContain('>Faol<')
    expect(html).toContain('>Faol emas<')
    expect(html).toContain('>Noma’lum<')
    expect(html).not.toContain('>777<')
    expect(html).not.toContain('10:15')
    expect(html).not.toContain(JSON.stringify(cashier.terminals))
  })

  it('shows an explicit empty state', () => {
    const html = renderToStaticMarkup(<CashierTerminalsContent cashier={{ ...cashier, terminals: [] }} />)
    expect(html).toContain('Bu kassirga terminal biriktirilmagan.')
    expect(html).not.toMatch(/<li(?:\s|>)/)
  })

  it('does not mount the assignment lookup surface just by opening the modal', () => {
    const assignmentMount = vi.fn()
    function AssignmentSurface() { assignmentMount(); return <p>assignment-form</p> }
    const html = renderToStaticMarkup(<CashierTerminalsDialog cashier={cashier} onClose={() => undefined}
      assignSurface={<AssignmentSurface />} />)
    expect(assignmentMount).not.toHaveBeenCalled()
    expect(html).toContain('Terminallarni qo‘shish')
    expect(html).not.toContain('assignment-form')
    expect(dialogSource).toContain('assignOpen ? assignSurface')
    expect(dialogSource).toContain('onClick={() => setAssignOpen(true)}')
    expect(dialogSource).not.toMatch(/\bfetch\s*\(|\buseQuery\s*\(|\bqueryKey\s*:/)
  })

  it('retains authorized unassign controls and existing confirmation surfaces', () => {
    const html = renderToStaticMarkup(<CashierTerminalsContent cashier={cashier} onUnassign={() => undefined}
      unassignSurface={<p>existing-unassign-confirmation</p>} />)
    expect(html.match(/>Ajratish</g)).toHaveLength(3)
    expect(html).toContain('existing-unassign-confirmation')
    expect(renderToStaticMarkup(<CashierTerminalsContent cashier={cashier} />)).not.toContain('>Ajratish<')
    expect(pageSource).toContain("can(access, 'cashier.assignTerminals', false)")
    expect(pageSource).toContain("can(access, 'cashier.unassignTerminal', false)")
    expect(pageSource).toContain('<AssignTerminalsPanel')
    expect(pageSource).toContain('<UnassignTerminalPanel')
  })
})
