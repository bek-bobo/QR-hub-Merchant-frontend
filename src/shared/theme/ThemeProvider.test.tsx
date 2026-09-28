import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { useTheme } from './useTheme'

function ThemeProbe() {
  const theme = useTheme()

  return (
    <span data-mode={theme.mode} data-resolved-theme={theme.resolvedTheme}>
      child preserved
    </span>
  )
}

describe('ThemeProvider', () => {
  it('provides the safe default theme and preserves children during server render', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    expect(html).toContain('data-mode="system"')
    expect(html).toContain('data-resolved-theme="light"')
    expect(html).toContain('child preserved')
  })

  it('rejects hook use outside the provider boundary', () => {
    expect(() => renderToStaticMarkup(<ThemeProbe />)).toThrow(
      'useTheme must be used within ThemeProvider.',
    )
  })

  it('does not persist while initializing from stored or system state', () => {
    const setItem = vi.fn()
    vi.stubGlobal('window', {
      localStorage: { getItem: () => 'system', setItem },
      matchMedia: () => ({ matches: true }),
    })

    try {
      renderToStaticMarkup(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      )
      expect(setItem).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

