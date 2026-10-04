import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TrendEntryRamps } from './TrendEntryRamps'

describe('decorative ramp overlay', () => {
  it('renders only hidden, noninteractive strokes with no fill, labels or data tooltip', () => {
    const html = renderToStaticMarkup(<TrendEntryRamps width={600} height={320} ramps={[{
      key: 'success', color: 'green', start: [40, 300], end: [58, 100], path: 'M 40 300 C 46 300, 54 100, 58 100',
    }]} />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('focusable="false"')
    expect(html).toContain('pointer-events="none"')
    expect(html).toContain('fill="none"')
    expect(html).toContain('stroke-width="2"')
    expect(html).toContain('stop-color="green"')
    expect(html).not.toMatch(/<text|<title|tooltip|role="img"/)
  })

  it('omits empty and unmeasured overlays', () => {
    expect(renderToStaticMarkup(<TrendEntryRamps width={600} height={320} ramps={[]} />)).toBe('')
    expect(renderToStaticMarkup(<TrendEntryRamps width={0} height={0} ramps={[]} />)).toBe('')
  })
})
