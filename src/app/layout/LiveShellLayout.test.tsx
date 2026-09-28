import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Header } from './Header'
import { LiveShellLayout } from './LiveShellLayout'

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/account', label: 'Hisob' },
] as const

describe('LiveShellLayout', () => {
  it('keeps one page heading and a desktop-only persistent sidebar', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/dashboard']}>
        <LiveShellLayout
          header={(navigation) => (
            <Header
              navigationOpen={navigation.open}
              navigationControls={navigation.controls}
              navigationTriggerRef={navigation.triggerRef}
              onOpenNavigation={navigation.openNavigation}
            />
          )}
          navigationItems={navigationItems}
        >
          <PageHeader
            title="Dashboard"
            actions={<button type="button">Yangilash</button>}
          />
        </LiveShellLayout>
      </MemoryRouter>,
    )

    const aside = html.match(/<aside\b[^>]*>[\s\S]*?<\/aside>/)?.[0]
    const shellHeader = html.match(/<header\b[^>]*border-b[^>]*>[\s\S]*?<\/header>/)?.[0]
    const navigation = aside?.match(/<nav\b[^>]*aria-label="Live navigatsiya"[^>]*>[\s\S]*?<\/nav>/)?.[0]

    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(aside).toBeDefined()
    expect(aside).toContain('hidden')
    expect(aside).toContain('lg:block')
    expect(navigation).toContain('href="/dashboard"')
    expect(navigation).toContain('href="/account"')
    expect(html).toContain('aria-label="Navigatsiyani ochish"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-controls="live-mobile-navigation"')
    expect(shellHeader).toBeDefined()
    expect(shellHeader).not.toContain('Dashboard')
    expect(html).toContain('<main')
    expect(html).toContain('>Dashboard</h1>')
    expect(aside).not.toContain('<main')
    expect(aside).not.toContain('<h1')
  })

  it('keeps header and page content usable with an empty filtered model', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LiveShellLayout
          header={(navigation) => (
            <Header
              navigationOpen={navigation.open}
              navigationControls={navigation.controls}
              navigationTriggerRef={navigation.triggerRef}
              onOpenNavigation={navigation.openNavigation}
            />
          )}
          navigationItems={[]}
        >
          <PageHeader title="Hisob" />
        </LiveShellLayout>
      </MemoryRouter>,
    )

    expect(html).toContain('aria-label="Navigatsiyani ochish"')
    expect(html).toContain('>Hisob</h1>')
    expect(html).not.toContain('<nav')
  })
})
