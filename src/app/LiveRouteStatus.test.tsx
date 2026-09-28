import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LiveRouteStatus } from './LiveRouteStatus'

describe('LiveRouteStatus', () => {
  it('renders an unavailable authenticated route with one primary heading', () => {
    const html = renderToStaticMarkup(
      <LiveRouteStatus
        kind="unavailable"
        title="Dashboard hozircha sozlanmagan"
        description="Dashboard funksiyasi ushbu muhitda hozircha mavjud emas."
      />,
    )

    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Dashboard hozircha sozlanmagan</h1>')
    expect(html).toContain('Funksiya mavjud emas')
    expect(html).toContain('role="alert"')
  })

  it('renders access denial with one primary heading and neutral status copy', () => {
    const html = renderToStaticMarkup(
      <LiveRouteStatus
        kind="forbidden"
        title="Ruxsat mavjud emas"
        description="Bu bo‘lim uchun tasdiqlangan ruxsat topilmadi."
      />,
    )

    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).toContain('>Ruxsat mavjud emas</h1>')
    expect(html).toContain('Ko‘rish uchun ruxsat yo‘q')
    expect(html).toContain('Bu bo‘lim uchun tasdiqlangan ruxsat topilmadi.')
  })
})
