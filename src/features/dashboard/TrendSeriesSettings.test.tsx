import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { TrendSeriesSettings, TrendSeriesSettingsList } from './TrendSeriesSettings'
import { ALL_TREND_SERIES } from './trend-presentation'

vi.mock('react', async (importOriginal) => ({ ...await importOriginal<typeof import('react')>(), useId: () => 'series-help' }))

function inputs(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return []
    return child.type === 'input' ? [child] : inputs(child.props.children as ReactNode)
  })
}

describe('Merchant chart series settings', () => {
  it('has a named compact trigger and four labeled checked native checkboxes by default', () => {
    expect(renderToStaticMarkup(<TrendSeriesSettings visible={ALL_TREND_SERIES} onToggle={() => {}} />))
      .toContain('aria-label="Grafik qatorlarini sozlash"')
    const html = renderToStaticMarkup(<TrendSeriesSettingsList visible={ALL_TREND_SERIES} onToggle={() => {}} />)
    expect(html.match(/type="checkbox"/g)).toHaveLength(4)
    expect(html.match(/checked=""/g)).toHaveLength(4)
    for (const label of ['Jami', 'Muvaffaqiyatli', 'Jarayonda', 'Muvaffaqiyatsiz']) expect(html).toContain(label)
  })

  it('routes checkbox changes to the stable ID and explains the disabled final checkbox', () => {
    const onToggle = vi.fn()
    const tree = TrendSeriesSettingsList({ visible: ['success'], onToggle })
    const checkboxes = inputs(tree)
    expect(checkboxes.map((input) => input.props.checked)).toEqual([false, true, false, false])
    expect(checkboxes.map((input) => input.props.disabled)).toEqual([false, true, false, false])
    const change = checkboxes[0]!.props.onChange as () => void
    change()
    expect(onToggle).toHaveBeenCalledWith('total')
    const html = renderToStaticMarkup(tree)
    expect(html).toContain('aria-describedby="series-help"')
    expect(html).toContain('Kamida bitta qator tanlangan bo‘lishi kerak.')
  })
})
