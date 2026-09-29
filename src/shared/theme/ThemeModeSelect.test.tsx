import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ThemeContext } from './ThemeContext'
import { ThemeModeSelect } from './ThemeModeSelect'

describe('ThemeModeSelect', () => {
  it.each(['light', 'dark', 'system'] as const)(
    'renders %s as the exposed current selection',
    (mode) => {
      const html = renderToStaticMarkup(
        <ThemeContext.Provider
          value={{
            mode,
            resolvedTheme: mode === 'dark' ? 'dark' : 'light',
            setMode: vi.fn(),
          }}
        >
          <ThemeModeSelect />
        </ThemeContext.Provider>,
      )

      expect(html).toContain('<label')
      expect(html).toContain('Ko‘rinish')
      expect(html).toContain('<select')
      expect(html).toContain('data-slot="select"')
      expect(html).toContain(`value="${mode}" selected=""`)
      expect(html).toContain('>Light</option>')
      expect(html).toContain('>Dark</option>')
      expect(html).toContain('>System</option>')
    },
  )

  it('renders the compact mode as an icon button instead of a select', () => {
    const html = renderToStaticMarkup(
      <ThemeContext.Provider
        value={{ mode: 'light', resolvedTheme: 'light', setMode: vi.fn() }}
      >
        <ThemeModeSelect compact />
      </ThemeContext.Provider>,
    )

    expect(html).toContain('<button')
    expect(html).toContain('aria-label="Ko‘rinish: Yorug‘. Keyingi rejimga o‘tish"')
    expect(html).not.toContain('<select')
  })
})

