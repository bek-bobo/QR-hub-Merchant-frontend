import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  TableColumnPreferenceList,
  TableColumnPreferenceReset,
  TableColumnPreferences,
} from './TableColumnPreferences'

const items = [
  { id: 'qrId', label: 'QR ID' },
  { id: 'createdAt', label: 'Yaratilgan vaqt' },
] as const

describe('TableColumnPreferences', () => {
  it('renders a closed table-local trigger', () => {
    const html = renderToStaticMarkup(
      <TableColumnPreferences
        tableLabel="Dinamik QR"
        items={items}
        order={items.map((item) => item.id)}
        onMoveUp={() => undefined}
        onMoveDown={() => undefined}
        onReset={() => undefined}
      />,
    )

    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('>Jadval ustunlari</button>')
  })

  it('renders an opt-in icon-only trigger with an accessible hover and focus tooltip', () => {
    const html = renderToStaticMarkup(
      <TableColumnPreferences
        tableLabel="Dinamik QR"
        items={items}
        order={items.map((item) => item.id)}
        iconOnly
        onMoveUp={() => undefined}
        onMoveDown={() => undefined}
        onReset={() => undefined}
      />,
    )

    const trigger = html.match(/<button\b[^>]*aria-label="Jadval ustunlari"[^>]*>[\s\S]*?<\/button>/)?.[0]
    expect(trigger).toBeDefined()
    expect(trigger).not.toContain('>Jadval ustunlari<')
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('>Jadval ustunlari</span>')
  })

  it('renders understandable positions, move labels and boundaries', () => {
    const html = renderToStaticMarkup(
      <TableColumnPreferenceList
        items={items}
        order={items.map((item) => item.id)}
        onMoveUp={() => undefined}
        onMoveDown={() => undefined}
      />,
    )

    expect(html).toContain('1 / 2')
    expect(html).toContain('2 / 2')
    expect(html).toContain('aria-label="QR ID ustunini chapga — ro‘yxatda yuqoriga ko‘chirish"')
    expect(html).toContain('aria-label="Yaratilgan vaqt ustunini o‘ngga — ro‘yxatda pastga ko‘chirish"')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
    expect(html).toContain('aria-live="polite"')
  })

  it('renders an explicit current-table reset action', () => {
    const html = renderToStaticMarkup(
      <TableColumnPreferenceReset onReset={() => undefined} />,
    )
    expect(html).toContain('Standart tartibga qaytarish')
  })
})
