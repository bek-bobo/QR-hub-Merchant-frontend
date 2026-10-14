// @vitest-environment happy-dom
import { act, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { mountManagement } from '@/test/management-i18n-fixture'
import { cashierPermissions, merchantPermissions } from '@/test/rbac-fixtures'
import { createLiveReadApi } from '@/app/read/createLiveReadApi'
import { getVisibleLiveNavigationItems } from '@/app/navigation'
import { LiveShellLayout } from './LiveShellLayout'
import { Header } from './Header'

describe('live RBAC responsive navigation', () => {
  it('updates desktop, collapsed and open mobile links when the effective snapshot changes', async () => {
    const api = createLiveReadApi({ webBaseUrl: 'https://web.example.test', environment: 'production', bridge: { get: async () => { throw Error('No request expected') } } })
    function Harness() {
      const [permissions, setPermissions] = useState<readonly string[]>(merchantPermissions)
      const items = getVisibleLiveNavigationItems({ kind: 'authenticated', permissions: new Set(permissions) }, api.registrations)
        .map((item) => ({ ...item, label: item.path }))
      return <LiveShellLayout navigationItems={items} header={(navigation) => <Header
        onOpenNavigation={navigation.openNavigation} navigationOpen={navigation.open} navigationControls={navigation.controls}
        navigationTriggerRef={navigation.triggerRef} onToggleSidebar={navigation.toggleSidebar} sidebarCollapsed={navigation.sidebarCollapsed} />}>
        <button onClick={() => setPermissions(cashierPermissions)}>Revoke P5</button>
        <button onClick={() => setPermissions([])}>Clear grants</button>
      </LiveShellLayout>
    }
    const fixture = await mountManagement('en', <Harness />)
    try {
      expect(fixture.host.querySelector('aside a[href="/devices"]')).not.toBeNull()
      const collapse = fixture.host.querySelector<HTMLButtonElement>('button[aria-label="Collapse sidebar"]')!
      await act(async () => collapse.click())
      expect(fixture.host.querySelector('aside a[href="/devices"]')?.getAttribute('aria-label')).toBe('/devices')
      const open = fixture.host.querySelector<HTMLButtonElement>('button[aria-controls="live-mobile-navigation"]')!
      await act(async () => open.click())
      expect(document.querySelector('#live-mobile-navigation a[href="/devices"]')).not.toBeNull()
      const revoke = Array.from(fixture.host.querySelectorAll('button')).find((button) => button.textContent === 'Revoke P5')!
      await act(async () => revoke.click())
      expect(document.querySelector('a[href="/devices"]')).toBeNull()
      expect(fixture.host.querySelector('aside a[href="/cashiers"]')).not.toBeNull()
      expect(document.querySelector('#live-mobile-navigation a[href="/cashiers"]')).not.toBeNull()
      const clear = Array.from(fixture.host.querySelectorAll('button')).find((button) => button.textContent === 'Clear grants')!
      await act(async () => clear.click())
      expect(document.querySelector('nav')).toBeNull()
    } finally { await fixture.dispose() }
  })
})
