import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ShellNavigation } from './ShellNavigation'

describe('ShellNavigation', () => {
  it('renders only supplied destinations and identifies the active route', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ShellNavigation
          items={[
            { path: '/dashboard', label: 'Dashboard' },
            { path: '/account', label: 'Hisob' },
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

  it('renders no navigation landmark for an empty filtered model', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ShellNavigation items={[]} label="Mobil navigatsiya" />
      </MemoryRouter>,
    )

    expect(html).toBe('')
  })
})
