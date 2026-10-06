import { Children, isValidElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { GranularityControl } from './GranularityControl'
import { dashboardMetadata } from './test-fixtures'

describe('Backend granularity controls', () => {
  it('uses allowed metadata for disabled buttons and resolved metadata for selection', () => {
    const onSelect = vi.fn()
    const aggregation = { ...dashboardMetadata.aggregation, allowedGranularities: ['DAY', 'WEEK'] as const }
    const tree = GranularityControl({ aggregation, onSelect })
    const buttons = Children.toArray(tree.props.children).filter(isValidElement) as { props: { children: ReactNode; disabled: boolean; 'aria-pressed': boolean; type: string; onClick: () => void } }[]
    expect(buttons.map(({ props }) => [props.children, props.disabled, props['aria-pressed']])).toEqual([
      ['Soat', true, false], ['Kun', false, true], ['Hafta', false, false], ['Oy', true, false], ['Yil', true, false],
    ])
    buttons[0]!.props.onClick()
    expect(onSelect).not.toHaveBeenCalled()
    buttons[2]!.props.onClick()
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('WEEK')
    expect(buttons.every(({ props }) => props.type === 'button')).toBe(true)
    const html = renderToStaticMarkup(tree)
    expect(html.match(/<button/g)).toHaveLength(5)
    expect(html.match(/disabled=""/g)).toHaveLength(3)
    expect(html).toContain('aria-pressed="true"')
  })
})
