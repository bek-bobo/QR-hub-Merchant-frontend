// @vitest-environment happy-dom
import { act, useEffect } from 'react'
import { useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LayoutDashboardIcon } from 'lucide-react'
import { mountManagement } from '@/test/management-i18n-fixture'
import uz from '@/locales/uz/shell.json'
import ru from '@/locales/ru/shell.json'
import en from '@/locales/en/shell.json'
import { Header } from './Header'
import { LiveShellLayout } from './LiveShellLayout'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('desktop sidebar toggle accent', () => {
  it.each(['uz', 'ru', 'en'] as const)('preserves shell state and localized controls in %s', async (locale) => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const mounted = vi.fn()
    function Content() {
      const location = useLocation()
      useEffect(() => { mounted() }, [])
      return <input aria-label="Dashboard draft" defaultValue={location.pathname} />
    }
    const fixture = await mountManagement(locale, <LiveShellLayout
      navigationItems={[{ path: '/', label: 'Dashboard', icon: LayoutDashboardIcon }]}
      header={(navigation) => <Header title="Dashboard" titleAsHeading
        onOpenNavigation={navigation.openNavigation} navigationControls={navigation.controls}
        navigationTriggerRef={navigation.triggerRef} navigationOpen={navigation.open}
        onToggleSidebar={navigation.toggleSidebar} sidebarCollapsed={navigation.sidebarCollapsed} />}
    ><Content /></LiveShellLayout>)
    try {
      const copy = { uz, ru, en }[locale].navigation
      const toggle = fixture.host.querySelector<HTMLButtonElement>(`button[aria-label="${copy.collapse}"]`)!
      const mobile = fixture.host.querySelector<HTMLButtonElement>(`button[aria-label="${copy.open}"]`)!
      const draft = fixture.host.querySelector<HTMLInputElement>('input')!
      draft.value = 'Preserved dashboard draft'
      const initialMounts = mounted.mock.calls.length
      const initialStorage = { ...localStorage }
      const styles = toggle.className
      expect(toggle.querySelector('.lucide-chevron-left')).not.toBeNull()
      expect(toggle.getAttribute('aria-expanded')).toBe('true')
      for (const name of ['size-10', 'lg:inline-flex', 'hover:bg-brand-soft!', 'hover:text-brand!', 'focus-visible:ring-brand/50', 'active:bg-brand/15!', 'active:not-aria-[haspopup]:translate-y-0']) {
        expect(toggle.classList.contains(name)).toBe(true)
      }
      expect(mobile.classList.contains('lg:hidden')).toBe(true)
      expect(mobile.querySelector('.lucide-menu')).not.toBeNull()
      expect(mobile.className).not.toContain('hover:bg-brand-soft!')
      await act(async () => toggle.click())
      expect(toggle.getAttribute('aria-label')).toBe(copy.expand)
      expect(toggle.getAttribute('aria-expanded')).toBe('false')
      expect(toggle.querySelector('.lucide-chevron-right')).not.toBeNull()
      expect(toggle.className).toBe(styles)
      expect(fixture.host.querySelector('.merchant-workspace')?.className).toContain('lg:grid-cols-[4.5rem_minmax(0,1fr)]')
      await act(async () => toggle.click())
      expect(toggle.getAttribute('aria-label')).toBe(copy.collapse)
      expect(toggle.querySelector('.lucide-chevron-left')).not.toBeNull()
      expect(fixture.host.querySelector('input')).toBe(draft)
      expect(draft.value).toBe('Preserved dashboard draft')
      expect(fixture.host.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/')
      expect(mounted).toHaveBeenCalledTimes(initialMounts)
      expect({ ...localStorage }).toEqual(initialStorage)
      expect(fetch).not.toHaveBeenCalled()
    } finally { await fixture.dispose() }
  })
})
