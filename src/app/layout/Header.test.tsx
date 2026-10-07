// @vitest-environment happy-dom
import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
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
    const host = document.createElement('div')
    host.innerHTML = html
    const themeSelect = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    expect(themeSelect.closest('label')?.textContent).toContain('Ko‘rinish')
    expect(themeSelect.textContent).toBe('System')
    expect(themeSelect.getAttribute('aria-expanded')).toBe('false')
    expect(themeSelect.disabled).toBe(false)
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

  it('renders an opt-in page title as the semantic heading', () => {
    const html = renderToStaticMarkup(
      <Header title="Dinamik QRlar" titleAsHeading />,
    )

    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Dinamik QRlar</h1>')
    expect(html).toContain('truncate')
    expect(html).not.toContain('<img')
    expect(html).toContain('lg:border-l')
  })

  it('places an optional decorative icon between navigation and the accessible page heading', () => {
    const html = renderToStaticMarkup(<Header title="Statik QRlar" titleAsHeading
      onOpenNavigation={vi.fn()} titleIcon={<span className="bg-brand-soft size-9"><img src="/qrhub-favicon.svg" alt="" /></span>} />)
    const host = document.createElement('div'); host.innerHTML = html
    const icon = host.querySelector('img')!
    expect(host.querySelectorAll('img')).toHaveLength(1)
    expect(icon.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(host.querySelector('h1')?.textContent).toBe('Statik QRlar')
    expect(html.indexOf('Navigatsiyani ochish')).toBeLessThan(html.indexOf('<img'))
    expect(html.indexOf('<img')).toBeLessThan(html.indexOf('<h1'))
  })

  it('uses the avatar as the accessible profile menu trigger and keeps identity in its tooltip', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ThemeContext.Provider
          value={{ mode: 'dark', resolvedTheme: 'dark', setMode: vi.fn() }}
        >
          <Header
            identityLabel="Behzod Yashinov"
            identitySecondary="MERCHANT"
            compactAccountControls
            onLogout={vi.fn()}
          />
        </ThemeContext.Provider>
      </MemoryRouter>,
    )

    expect(html.match(/Behzod Yashinov/g)).toHaveLength(1)
    expect(html.match(/MERCHANT/g)).toHaveLength(1)
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('aria-describedby="account-avatar-tooltip"')
    expect(html).toContain('aria-label="Profil menyusi"')
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('href="/account"')
    expect(html).toContain('>B</span>')
    expect(html).toContain('aria-label="Ko‘rinish: Tungi. Keyingi rejimga o‘tish"')
    expect(html).not.toContain('aria-label="Chiqish"')
    expect(html).not.toContain('lucide-log-out')
    expect(html.match(/<button\b/g)).toHaveLength(2)
    expect(html).not.toContain('<select')
    expect(html).not.toContain('>Chiqish</button>')
  })
})
