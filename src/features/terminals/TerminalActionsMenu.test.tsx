import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { decodeTerminalPage } from '@/shared/contracts/management-read'
import { TerminalActionsMenu } from './TerminalActionsMenu'

const items = vi.hoisted(() => ({ select: [] as Array<() => void> }))
vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  const part = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { ...actual, DropdownMenu: { ...actual.DropdownMenu,
    Root: part, Trigger: part, Portal: part, Content: part,
    Item: ({ children, onSelect }: { children: ReactNode; onSelect: () => void }) => {
      items.select.push(onSelect)
      return <div role="menuitem">{children}</div>
    },
  } }
})

describe('terminal row menu', () => {
  it('presents both actions and passes the loaded row to each callback', () => {
    const row = decodeTerminalPage({ success: true, data: { content: [{
      pkey: 'T', name: 'A', status: 0, merchantId: 1, merchantName: 'M', bankAccountId: 2, bankAccountName: 'B',
    }], totalElements: 1, totalPages: 1, page: 0, size: 10 } }).content[0]
    if (!row) throw new Error('Expected row')
    items.select = []
    const viewQr = vi.fn()
    const viewDetails = vi.fn()
    const html = renderToStaticMarkup(<TerminalActionsMenu row={row} onViewQr={viewQr} onViewDetails={viewDetails} />)
    expect(html).toContain('aria-label="Amallarni ochish"')
    expect(html).toContain('Statik QR ko‘rish')
    expect(html).toContain('Qo‘shimcha ma’lumotlar')
    expect(items.select).toHaveLength(2)
    items.select[0]?.()
    items.select[1]?.()
    expect(viewQr).toHaveBeenCalledWith(row)
    expect(viewDetails).toHaveBeenCalledWith(row)
  })
})
