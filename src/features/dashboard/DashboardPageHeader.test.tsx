import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DashboardPageHeader } from './DashboardPageHeader'

describe('DashboardPageHeader', () => {
  it('groups the formatted updated-at text with page context and keeps refresh available', () => {
    const html = renderToStaticMarkup(
      <DashboardPageHeader
        updatedAt="17:44:58"
        refreshDisabled={false}
        refreshing={false}
        onRefresh={() => undefined}
      />,
    )

    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Dashboard</h1>')
    expect(html).toContain('Tranzaksiyalar')
    expect(html).toContain('Qo‘llangan davr bo‘yicha backend ko‘rsatkichlari.')
    expect(html).toContain('Oxirgi yangilanish: 17:44:58')
    expect(html).toContain('>Yangilash</button>')
    expect(html.indexOf('Oxirgi yangilanish: 17:44:58')).toBeLessThan(
      html.indexOf('>Yangilash</button>'),
    )
  })

  it('preserves the disabled and spinning refresh presentation', () => {
    const html = renderToStaticMarkup(
      <DashboardPageHeader
        refreshDisabled
        refreshing
        onRefresh={() => undefined}
      />,
    )

    expect(html).not.toContain('Oxirgi yangilanish:')
    expect(html).toContain('disabled=""')
    expect(html).toContain('animate-spin')
    expect(html).toContain('>Yangilash</button>')
  })
})
