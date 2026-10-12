import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Native trend tooltip containment', () => {
  const css = readFileSync(new URL('./trend-tooltip.css', import.meta.url), 'utf8')
  it('uses a persistent chart-scoped anchor that native inline updates cannot replace', () => {
    expect(css).toContain('[data-trend-viewport] .g2-tooltip {')
    expect(css).toContain('left: auto !important;')
    expect(css).toContain('right: 8px !important;')
    expect(css).toContain('top: 8px !important;')
    expect(css).toContain('width: min(280px, calc(100% - 16px));')
    expect(css).not.toContain('font-size:')
  })
  it('keeps full date, status and exact values readable instead of native ellipsis', () => {
    expect(css).toContain('.g2-tooltip-title')
    expect(css).toContain('.g2-tooltip-list-item-name-label')
    expect(css).toContain('.g2-tooltip-list-item-value')
    expect(css).toContain('overflow: visible !important;')
    expect(css).toContain('white-space: normal !important;')
    expect(css).toContain('overflow-wrap: anywhere;')
    expect(css).toContain('margin-left: 0 !important;')
  })
})
