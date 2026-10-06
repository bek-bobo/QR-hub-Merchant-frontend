import { Children, isValidElement, type ReactNode, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LineConfig } from '@ant-design/plots'
import { TrendPlotViewport } from './TrendPlotViewport'
vi.mock('react', async (importOriginal) => ({ ...await importOriginal<typeof import('react')>(),
  useRef: (current: unknown) => ({ current }), useState: (value: unknown) => [value, vi.fn()],
  useEffect: () => undefined, useCallback: (callback: unknown) => callback,
}))
function findRenderer(node: ReactNode): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue
    if (typeof child.props.onReady === 'function') return child
    const nested = findRenderer(child.props.children as ReactNode)
    if (nested) return nested
  }
}
describe('Native active bucket keyboard interaction', () => {
  it('uses the library tooltip for arrows, Home, End and dismisses markers on Escape/blur', () => {
    const tree = TrendPlotViewport({ config: { scale: { x: { domain: ['0', '1', '2'] } } } })
    const ready = findRenderer(tree)!.props.onReady as (plot: unknown) => void
    const emit = vi.fn()
    ready({ chart: { emit } })
    const press = (key: string) => tree.props.onKeyDown({ key, preventDefault: vi.fn() })
    press('ArrowRight')
    expect(emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '0' } } })
    press('End'); press('ArrowRight')
    expect(emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '2' } } })
    press('Home'); press('ArrowLeft')
    expect(emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '0' } } })
    press('Escape'); tree.props.onBlur()
    expect(emit).toHaveBeenLastCalledWith('tooltip:hide', { nativeEvent: false })
    expect(tree.props.tabIndex).toBe(0)
    expect(tree.props.role).toBe('group')
  })
  it('does not emit a tooltip for an empty canonical domain', () => {
    const config: LineConfig = { scale: { x: { domain: [] } } }
    const tree = TrendPlotViewport({ config }), emit = vi.fn()
    ;(findRenderer(tree)!.props.onReady as (plot: unknown) => void)({ chart: { emit } })
    tree.props.onKeyDown({ key: 'ArrowRight', preventDefault: vi.fn() })
    expect(emit).not.toHaveBeenCalled()
  })
})
