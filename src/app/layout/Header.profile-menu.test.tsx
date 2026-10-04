import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeContext } from '@/shared/theme/ThemeContext'
import { Header } from './Header'

// Match the existing row-menu tests: expose portalled items during server rendering.
// Real Radix opening, dismissal, and keyboard behavior are checked in the browser.
const menu = vi.hoisted(() => ({
  items: [] as Array<{ onSelect?: () => void; disabled?: boolean }>,
}))

vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  const part = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { ...actual, DropdownMenu: { ...actual.DropdownMenu,
    Root: part, Trigger: part, Portal: part,
    Content: ({ children, side, align }: { children: ReactNode; side: string; align: string }) => (
      <div role="menu" data-side={side} data-align={align}>{children}</div>
    ),
    Item: ({ children, onSelect, disabled, className }: {
      children: ReactNode; onSelect?: () => void; disabled?: boolean; className?: string
    }) => {
      menu.items.push({ onSelect, disabled })
      return <div role="menuitem" aria-disabled={disabled} className={className}>{children}</div>
    },
  } }
})

function renderHeader(onLogout: () => void, logoutPending = false) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ThemeContext.Provider value={{ mode: 'dark', resolvedTheme: 'dark', setMode: vi.fn() }}>
        <Header compactAccountControls identityLabel="X" onLogout={onLogout} logoutPending={logoutPending} />
      </ThemeContext.Provider>
    </MemoryRouter>,
  )
}

beforeEach(() => { menu.items = [] })

describe('Header profile menu actions', () => {
  it('keeps the X trigger a button and exposes exactly Profil and Chiqish below it', () => {
    const onLogout = vi.fn()
    const html = renderHeader(onLogout)
    expect(html).toMatch(/<button[^>]*aria-label="Profil menyusi"/)
    expect(html).toContain('>X</span>')
    expect(html).toContain('data-side="bottom" data-align="end"')
    expect(html.match(/role="menuitem"/g)).toHaveLength(2)
    expect(html).toMatch(/<a[^>]*href="\/account"[^>]*>Profil<\/a>/)
    expect(html).toContain('Chiqish</div>')
    expect(menu.items[0]?.onSelect).toBeUndefined()
    expect(menu.items[1]?.onSelect).toBe(onLogout)
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('delegates Chiqish to the same existing logout callback', () => {
    const onLogout = vi.fn()
    renderHeader(onLogout)
    menu.items[1]?.onSelect?.()
    expect(onLogout).toHaveBeenCalledExactlyOnceWith()
  })

  it('styles only logout as destructive with the existing icon and a subtle highlighted background', () => {
    const html = renderHeader(vi.fn())
    const items = html.match(/<div role="menuitem"[^>]*>[\s\S]*?<\/div>/g)
    expect(items).toHaveLength(2)
    expect(items?.[0]).not.toContain('destructive')
    expect(items?.[1]).toContain('text-destructive')
    expect(items?.[1]).toContain('data-[highlighted]:bg-destructive/10')
    expect(items?.[1]).toContain('dark:data-[highlighted]:bg-destructive/20')
    expect(items?.[1]).not.toContain('data-[highlighted]:text-text-primary')
    expect(items?.[1]).toContain('items-center gap-2')
    expect(items?.[1]).toContain('lucide-log-out size-4 shrink-0')
    expect(items?.[1]).toContain('aria-hidden="true"')
    expect(html.match(/lucide-log-out/g)).toHaveLength(1)
    expect(html.match(/<button\b/g)).toHaveLength(2)
  })

  it('disables menu logout while logout is pending', () => {
    const onLogout = vi.fn()
    const html = renderHeader(onLogout, true)
    expect(menu.items[1]?.disabled).toBe(true)
    expect(html).toContain('role="menuitem" aria-disabled="true"')
    expect(onLogout).not.toHaveBeenCalled()
  })
})
