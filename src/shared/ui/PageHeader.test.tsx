import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('owns one primary heading and keeps supporting content associated', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        eyebrow="Tranzaksiyalar"
        title="Dashboard"
        description="Backend ko‘rsatkichlari."
        descriptionId="dashboard-description"
        meta="Oxirgi yangilanish: 17:44:58"
        actions={<button type="button">Yangilash</button>}
      />,
    )

    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Dashboard</h1>')
    expect(html).toContain('id="dashboard-description"')
    expect(html).toContain('Tranzaksiyalar')
    expect(html).toContain('Oxirgi yangilanish: 17:44:58')
    expect(html).toContain('>Yangilash</button>')
    expect(html).toContain('flex-wrap')
    expect(html.indexOf('Backend ko‘rsatkichlari.')).toBeLessThan(
      html.indexOf('Oxirgi yangilanish: 17:44:58'),
    )
    expect(html.indexOf('Oxirgi yangilanish: 17:44:58')).toBeLessThan(
      html.indexOf('>Yangilash</button>'),
    )
  })

  it('renders only the required title when optional content is absent', () => {
    const html = renderToStaticMarkup(<PageHeader title="Hisob" />)

    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Hisob</h1>')
    expect(html).not.toContain('<p')
  })
})
