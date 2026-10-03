import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DashboardPageHeader } from './DashboardPageHeader'

describe('DashboardPageHeader', () => {
  it('groups filters, refresh, and updated-at metadata without rendering a page heading', () => {
    const html = renderToStaticMarkup(
      <DashboardPageHeader
        updatedAt="17:44:58"
        refreshDisabled={false}
        refreshing={false}
        onRefresh={() => undefined}
        quickFilters={<button type="button">Sana oralig‘i</button>}
      >
        <button type="button">Filtrlar</button>
      </DashboardPageHeader>,
    )

    expect(html.match(/<h1\b/g)).toBeNull()
    expect(html).not.toContain('Tranzaksiyalar')
    expect(html).not.toContain('Qo‘llangan davr bo‘yicha backend ko‘rsatkichlari.')
    expect(html).toContain('>Filtrlar</button>')
    expect(html.indexOf('>Sana oralig‘i</button>')).toBeLessThan(html.indexOf('>Filtrlar</button>'))
    expect(html).toContain('flex-wrap')
    expect(html).toContain('Oxirgi yangilanish: 17:44:58')
    expect(html).toContain('>Yangilash</button>')
    expect(html.indexOf('Oxirgi yangilanish: 17:44:58')).toBeLessThan(
      html.indexOf('>Filtrlar</button>'),
    )
    expect(html.indexOf('>Filtrlar</button>')).toBeLessThan(
      html.indexOf('>Yangilash</button>'),
    )
  })

  it('preserves the disabled and spinning refresh presentation', () => {
    const html = renderToStaticMarkup(
      <DashboardPageHeader
        refreshDisabled
        refreshing
        onRefresh={() => undefined}
      >
        <button type="button">Filtrlar</button>
      </DashboardPageHeader>,
    )

    expect(html).not.toContain('Oxirgi yangilanish:')
    expect(html).toContain('disabled=""')
    expect(html).toContain('animate-spin')
    expect(html).toContain('>Yangilash</button>')
  })
})
