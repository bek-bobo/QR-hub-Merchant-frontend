import type { ReactNode } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InfoIcon, MinusIcon } from 'lucide-react'
import { RowActionMenu, RowActionItem, RowActionSeparator } from './RowActionMenu'

const capture = vi.hoisted(() => ({
  items: [] as Array<{ disabled?: boolean; onSelect?: () => void; className?: string }>,
  content: {} as Record<string, unknown>,
}))
vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  return { ...actual, DropdownMenu: { ...actual.DropdownMenu,
    Portal: ({ children }: { children: ReactNode }) => <>{children}</>,
    Content: ({ children, ...props }: { children: ReactNode }) => {
      capture.content = props
      return <div role="menu">{children}</div>
    },
    Item: ({ children, ...props }: { children: ReactNode; disabled?: boolean; onSelect?: () => void; className?: string }) => {
      capture.items.push(props)
      return <div role="menuitem" aria-disabled={props.disabled} className={props.className}>{children}</div>
    },
    Separator: () => <div role="separator" />,
  } }
})
beforeEach(() => { capture.items = []; capture.content = {} })

describe('shared row action menu', () => {
  it('keeps an accessible Radix trigger and passes popup focus handling through', () => {
    const close = vi.fn()
    const action = vi.fn()
    const html = renderToStaticMarkup(<RowActionMenu label="Qurilma uchun amallar" contentProps={{ onCloseAutoFocus: close }}>
      <RowActionItem icon={InfoIcon} onSelect={action}>Ma’lumotlar</RowActionItem>
    </RowActionMenu>)
    expect(html).toContain('aria-label="Qurilma uchun amallar"')
    expect(html).toContain('aria-haspopup="menu"')
    expect(action).not.toHaveBeenCalled()
    expect(capture.content.onCloseAutoFocus).toBe(close)
    expect(capture.content.align).toBe('end')
    expect(capture.content.avoidCollisions).toBe(true)
    expect(capture.content.collisionPadding).toBe(12)
    capture.items[0]?.onSelect?.()
    expect(action).toHaveBeenCalledOnce()
  })

  it('preserves ordered normal, destructive and disabled items without invoking actions on render', () => {
    const normal = vi.fn(), destructive = vi.fn()
    const html = renderToStaticMarkup(<RowActionMenu>
      <RowActionItem icon={InfoIcon} onSelect={normal}>Ko‘rish</RowActionItem>
      <RowActionSeparator />
      <RowActionItem icon={MinusIcon} destructive onSelect={destructive}>Ajratish</RowActionItem>
      <RowActionItem icon={InfoIcon} disabled>Ruxsat yo‘q</RowActionItem>
    </RowActionMenu>)
    expect(html.indexOf('Ko‘rish')).toBeLessThan(html.indexOf('Ajratish'))
    expect(capture.items[0]?.className).toContain('data-[highlighted]:bg-brand-soft')
    expect(capture.items[1]?.className).toContain('text-destructive')
    expect(capture.items[2]?.disabled).toBe(true)
    expect(capture.items[2]?.onSelect).toBeUndefined()
    expect(normal).not.toHaveBeenCalled()
    expect(destructive).not.toHaveBeenCalled()
    capture.items[1]?.onSelect?.()
    expect(destructive).toHaveBeenCalledOnce()
  })
})
