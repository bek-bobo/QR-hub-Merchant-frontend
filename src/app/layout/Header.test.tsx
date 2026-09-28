import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ThemeContext } from '@/shared/theme/ThemeContext'
import { Header } from './Header'

describe('Header', () => {
  it('omits authenticated route context while preserving the mobile trigger and identity actions', () => {
    const html = renderToStaticMarkup(
      <ThemeContext.Provider
        value={{ mode: 'system', resolvedTheme: 'dark', setMode: vi.fn() }}
      >
        <Header
          navigationOpen={false}
          navigationControls="live-mobile-navigation"
          navigationTriggerRef={createRef<HTMLButtonElement>()}
          onOpenNavigation={vi.fn()}
          identityLabel="Merchant User"
          onLogout={vi.fn()}
        />
      </ThemeContext.Provider>,
    )

    expect(html).not.toContain('<h1')
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('Dashboard')
    expect(html).toContain('aria-label="Navigatsiyani ochish"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-controls="live-mobile-navigation"')
    expect(html).toContain('Merchant User')
    expect(html).toContain('Ko‘rinish')
    expect(html).toContain('value="system" selected=""')
    expect(html).toContain('Chiqish')
  })

  it('preserves optional route context for the non-production demo shell', () => {
    const html = renderToStaticMarkup(
      <Header title="Juda uzun joriy bo‘lim nomi" />,
    )

    expect(html).toContain('Juda uzun joriy bo‘lim nomi')
    expect(html).toContain('min-w-0')
    expect(html).toContain('truncate')
    expect(html).toContain('text-sm')
    expect(html).not.toContain('Ko‘rinish')
  })
})
