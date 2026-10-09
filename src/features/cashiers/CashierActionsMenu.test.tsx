import type { ReactNode } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CashierRow } from '@/shared/contracts/management-read'
import { CashierActionsMenu } from './CashierActionsMenu'

const capture = vi.hoisted(() => ({
  items: [] as Array<{ disabled?: boolean; onSelect?: () => void }>,
  close: undefined as undefined | ((event: { preventDefault: () => void }) => void),
}))
// Keep the real Radix root/trigger for button semantics; expose portalled items
// in the repository's server-rendering tests.
vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  return { ...actual, DropdownMenu: { ...actual.DropdownMenu,
    Portal: ({ children }: { children: ReactNode }) => <>{children}</>,
    Content: ({ children, onCloseAutoFocus }: { children: ReactNode; onCloseAutoFocus: typeof capture.close }) => {
      capture.close = onCloseAutoFocus
      return <div role="menu">{children}</div>
    },
    Item: ({ children, disabled, onSelect }: { children: ReactNode; disabled?: boolean; onSelect?: () => void }) => {
      capture.items.push({ disabled, onSelect })
      return <div role="menuitem" aria-disabled={Boolean(disabled)}>{children}</div>
    },
  } }
})

const row: CashierRow = { id: 'cashier-Exact', fullname: 'Cashier A', phone: '+998901234567',
  roleDisplay: 'User', statusCode: 0, createdAt: null, updatedAt: null,
  terminals: [{ id: 'terminal-Exact', name: 'Terminal A', statusCode: 0 }] }

beforeEach(() => { capture.items = []; capture.close = undefined })

describe('cashier row actions', () => {
  it('uses the existing compact Radix trigger and exactly three ordered actions', () => {
    const view = vi.fn(), assign = vi.fn(), unassign = vi.fn()
    const html = renderToStaticMarkup(<CashierActionsMenu row={row} onViewTerminals={view} onAssign={assign} onUnassign={unassign} />)
    expect(html).toContain('aria-label="Cashier A uchun amallarni ochish"')
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).toContain('data-size="icon-sm"')
    expect(capture.items).toHaveLength(3)
    expect(html.indexOf('Faol terminallar')).toBeLessThan(html.indexOf('Terminal qo‘shish'))
    expect(html.indexOf('Terminal qo‘shish')).toBeLessThan(html.indexOf('Terminal ajratish'))
    capture.items.forEach((item) => item.onSelect?.())
    expect(view).toHaveBeenCalledExactlyOnceWith(row, null)
    expect(assign).toHaveBeenCalledExactlyOnceWith(row, null)
    expect(unassign).toHaveBeenCalledExactlyOnceWith(row, null)
    const preventDefault = vi.fn()
    capture.close?.({ preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    capture.close?.({ preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
  })

  it.each([0, 1, 3])('keeps the active count %s in the viewing action without another request', (count) => {
    const cashier = { ...row, terminals: Array.from({ length: count }, () => row.terminals[0]!) }
    const html = renderToStaticMarkup(<CashierActionsMenu row={cashier} onViewTerminals={vi.fn()} onAssign={vi.fn()} onUnassign={vi.fn()} />)
    expect(html.replace(/<!-- -->/g, '')).toContain(`Faol terminallar · ${count}`)
    expect(capture.items[0]?.disabled).toBeUndefined()
    expect(capture.items[2]?.disabled).toBe(count === 0)
    if (!count) expect(capture.items[2]?.onSelect).toBeUndefined()
  })

  it.each([[false, false], [true, false], [false, true], [true, true]])
  ('enforces assign=%s and unassign=%s grants independently', (assignAllowed, unassignAllowed) => {
    renderToStaticMarkup(<CashierActionsMenu row={row} onViewTerminals={vi.fn()}
      onAssign={assignAllowed ? vi.fn() : undefined} onUnassign={unassignAllowed ? vi.fn() : undefined} />)
    expect(capture.items[1]?.disabled).toBe(!assignAllowed)
    expect(capture.items[2]?.disabled).toBe(!unassignAllowed)
    if (!assignAllowed) expect(capture.items[1]?.onSelect).toBeUndefined()
    if (!unassignAllowed) expect(capture.items[2]?.onSelect).toBeUndefined()
  })
})
