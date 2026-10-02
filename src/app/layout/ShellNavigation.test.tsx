import { renderToStaticMarkup } from 'react-dom/server'
import { LayoutDashboardIcon, UserRoundIcon } from 'lucide-react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ShellNavigation } from './ShellNavigation'
import { getVisibleLiveNavigationItems } from '../navigation'

describe('ShellNavigation', () => {
  it.each(['Live navigatsiya', 'Mobil navigatsiya'])('keeps creation out of %s while retaining cashiers', (label) => {
    const ready = { kind: 'configured' as const }
    const items = getVisibleLiveNavigationItems({ kind: 'authenticated', permissions: new Set(['GET_CASHIERS', 'CREATE_CASHIER']) }, {
      dashboard: ready, dynamicQr: ready, terminalLookup: ready, terminalList: ready,
      bankAccountList: ready, cashierList: ready, merchantLookup: ready, bankAccountLookup: ready, p5List: ready,
      regionLookup: ready, districtLookup: ready,
    })
    const html = renderToStaticMarkup(<MemoryRouter><ShellNavigation items={items} label={label} /></MemoryRouter>)
    expect(html).toContain('href="/cashiers"')
    expect(html).not.toContain('/cashiers/new')
    expect(html).not.toContain('Yangi kassir')
  })
  it('renders only supplied destinations and identifies the active route', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ShellNavigation
          items={[
            { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
            { path: '/account', label: 'Hisob', icon: UserRoundIcon },
          ]}
          label="Mobil navigatsiya"
        />
      </MemoryRouter>,
    )

    expect(html).toContain('aria-label="Mobil navigatsiya"')
    expect(html).toContain('href="/dashboard"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('bg-primary')
    expect(html).toContain('href="/account"')
    expect(html).not.toContain('/cashiers/new')
  })

  it('keeps collapsed destinations named and exposes right-side tooltips', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ShellNavigation
          items={[{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon }]}
          label="Live navigatsiya"
          collapsed
        />
      </MemoryRouter>,
    )

    expect(html).toContain('aria-label="Dashboard"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('>Dashboard</span>')
  })

  it('renders no navigation landmark for an empty filtered model', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ShellNavigation items={[]} label="Mobil navigatsiya" />
      </MemoryRouter>,
    )

    expect(html).toBe('')
  })
})
