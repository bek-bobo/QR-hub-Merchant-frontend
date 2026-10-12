// @vitest-environment happy-dom
import { act, StrictMode, useEffect } from 'react'
import { createRoot, type Root } from '@/test/locale-fixture'
import type { LineConfig } from '@ant-design/plots'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TrendPlotViewport } from './TrendPlotViewport'
import { TrendChart } from './TrendChart'
import * as presentation from './trend-presentation'
import { dashboardMetadata, dashboardZero, completedCoverage, nextDate } from './test-fixtures'
import type { DashboardView } from '@/shared/contracts/merchant-read'

const renderer = vi.hoisted(() => ({ props: null as LineConfig | null, emit: vi.fn(),
  mode: 'ready' as 'ready' | 'pending' | 'failed', pending: new Promise<never>(() => {}) }))
// Stub only the external renderer port. Viewport hooks and boundaries remain real.
vi.mock('./LazyPlotRenderers', () => ({ TrendLinePlotRenderer: (props: LineConfig) => {
  const onReady = props.onReady
  useEffect(() => {
    onReady?.({ chart: { emit: renderer.emit } } as unknown as Parameters<NonNullable<LineConfig['onReady']>>[0])
  }, [onReady])
  renderer.props = props
  if (renderer.mode === 'pending') throw renderer.pending
  if (renderer.mode === 'failed') throw new Error('Renderer unavailable')
  return <div data-renderer>Plot renderer port</div>
} }))

const mounted: { root: Root; host: HTMLElement }[] = []
const observers: Observer[] = []
class Observer {
  observe = vi.fn()
  disconnect = vi.fn()
  readonly callback: (entries: { contentRect: { width: number } }[]) => void
  constructor(callback: Observer['callback']) { this.callback = callback; observers.push(this) }
  resize(width: number) { this.callback([{ contentRect: { width } }]) }
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  renderer.mode = 'ready'; renderer.props = null; renderer.emit.mockClear(); observers.length = 0
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  vi.stubGlobal('ResizeObserver', Observer)
})
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) {
    await act(async () => root.unmount()); host.remove()
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function chartView(): DashboardView {
  const raw = { count: 2, amount: { minorUnits: '900719925474099301', currency: 'UZS' as const, scale: 2 as const } }
  const metric = { ...raw, countGrowthPct: null, amountGrowthPct: null }
  return { ...dashboardMetadata, chartGroupBy: 'DAY', metrics: { total: metric, success: metric, processing: metric, failed: metric, uncategorized: dashboardZero },
    pie: { success: { ...raw, percent: 34 }, processing: { ...raw, percent: 33 }, failed: { ...raw, percent: 33 }, uncategorized: dashboardZero },
    buckets: ['2026-10-01', '2026-10-02', '2026-10-03'].map((start) => ({ ...completedCoverage(start, nextDate(start)), periodKind: 'calendar', periodStart: start, periodEnd: nextDate(start), label: start,
      values: { total: raw, success: raw, processing: raw, failed: raw, uncategorized: dashboardZero } })) }
}
async function setupChart(strict = false) {
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host); mounted.push({ root, host })
  const render = async (view: DashboardView, unavailable = false) => {
    const chart = <TrendChart view={view} feedback={<p>Parent feedback</p>} plotUnavailable={unavailable} />
    await act(async () => root.render(strict ? <StrictMode>{chart}</StrictMode> : chart))
  }
  const view = chartView()
  await render(view)
  const press = async (key: string) => {
    const viewport = host.querySelector<HTMLElement>('[data-trend-viewport]')!
    await act(async () => { viewport.focus(); viewport.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })) })
  }
  return { host, root, view, render, press }
}

describe('F09 real TrendChart semantic rendering (external renderer port)', () => {
  it.each([false, true])('preserves interaction and skips preparation on unrelated rerenders (StrictMode=%s)', async (strict) => {
    const build = vi.spyOn(presentation, 'createTrendPlotConfig')
    const data = vi.spyOn(presentation, 'trendPlotData')
    const availability = vi.spyOn(presentation, 'availableTrendSeries')
    const h = await setupChart(strict)
    expect(build).toHaveBeenCalledTimes(strict ? 2 : 1)
    expect(data).toHaveBeenCalledTimes(strict ? 2 : 1)
    expect(availability).toHaveBeenCalledTimes(strict ? 2 : 1)
    await h.press('Home')
    build.mockClear(); data.mockClear(); availability.mockClear(); renderer.emit.mockClear()
    const oldData = renderer.props!.data
    const oldAxis = renderer.props!.axis
    const oldArea = renderer.props!.area
    await h.render({ ...h.view, metrics: { ...h.view.metrics } })
    expect(build).not.toHaveBeenCalled(); expect(data).not.toHaveBeenCalled(); expect(availability).not.toHaveBeenCalled()
    expect(renderer.props!.data).toBe(oldData)
    expect(renderer.props!.axis).toBe(oldAxis)
    expect(renderer.props!.area).toBe(oldArea)
    expect(renderer.emit).not.toHaveBeenCalled()
    await h.press('ArrowRight')
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '1' } } })
  })

  it('preserves equivalent recreated data and resets changed values safely in the same buckets', async () => {
    const h = await setupChart()
    await h.press('Home'); renderer.emit.mockClear()
    await h.render(structuredClone(h.view))
    expect(renderer.emit).not.toHaveBeenCalled()
    await h.press('ArrowRight')
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '1' } } })
    const refreshed = { ...h.view, buckets: h.view.buckets.map((bucket, index) => index === 1
      ? { ...bucket, values: { ...bucket.values, success: { ...bucket.values.success, count: 17 } } } : bucket) }
    renderer.emit.mockClear()
    await h.render(refreshed)
    expect(renderer.emit).toHaveBeenCalledExactlyOnceWith('tooltip:hide', { nativeEvent: false })
    expect((renderer.props!.data as presentation.TrendPlotDatum[]).find((datum) => datum.bucket === '1' && datum.key === 'success')!.exactValue).toBe('17')
    expect(h.host.textContent).toContain('9 007 199 254 740 993.01 UZS')
    await h.press('ArrowLeft')
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '0' } } })
  })

  it.each(['removed', 'reordered', 'boundary', 'group'] as const)('resets safely when bucket semantics change: %s', async (change) => {
    const h = await setupChart()
    await h.press('End'); renderer.emit.mockClear()
    const next: DashboardView = { ...h.view,
      buckets: change === 'removed' ? h.view.buckets.slice(0, 2) : change === 'reordered' ? [...h.view.buckets].reverse()
        : change === 'boundary' ? h.view.buckets.map((bucket) => ({ ...bucket, periodEnd: nextDate(bucket.periodEnd) })) : h.view.buckets,
      chartGroupBy: change === 'group' ? 'WEEK' : h.view.chartGroupBy }
    await h.render(next)
    expect(renderer.emit).toHaveBeenCalledExactlyOnceWith('tooltip:hide', { nativeEvent: false })
    await h.press('ArrowRight')
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '0' } } })
  })

  it('resets for mode and visible series changes using real controls', async () => {
    const h = await setupChart()
    await h.press('End'); renderer.emit.mockClear()
    await act(async () => Array.from(h.host.querySelectorAll('button')).find((button) => button.textContent === 'Summa')!.click())
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:hide', { nativeEvent: false })
    await act(async () => h.host.querySelector<HTMLButtonElement>('[aria-label="Grafik qatorlarini sozlash"]')!.click())
    const total = Array.from(document.querySelectorAll('label')).find((label) => label.textContent === 'Jami')!.querySelector<HTMLInputElement>('input')!
    renderer.emit.mockClear()
    await act(async () => total.click())
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:hide', { nativeEvent: false })
    expect((renderer.props!.data as presentation.TrendPlotDatum[]).some((datum) => datum.key === 'total')).toBe(true)
  })

  it('updates theme and responsive ticks without resetting or rebuilding bucket data', async () => {
    const h = await setupChart()
    const data = vi.spyOn(presentation, 'trendPlotData')
    await h.press('Home'); renderer.emit.mockClear()
    const oldData = renderer.props!.data
    await act(async () => { document.documentElement.classList.add('dark'); await new Promise((resolve) => setTimeout(resolve, 0)) })
    expect(renderer.props!.theme).toBe('classicDark')
    expect(renderer.props!.data).toBe(oldData)
    await act(async () => observers[0]!.resize(180))
    const ticks = renderer.props!.axis!.x!.tickFilter as (tick: unknown, index: number) => boolean
    expect(ticks(null, 1)).toBe(false); expect(ticks(null, 2)).toBe(true)
    expect(data).not.toHaveBeenCalled(); expect(renderer.emit).not.toHaveBeenCalled()
    await h.press('ArrowRight')
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '1' } } })
  })

  it('scans availability once on each new dataset and hides unavailable plots locally', async () => {
    const availability = vi.spyOn(presentation, 'availableTrendSeries')
    const h = await setupChart()
    expect(availability).toHaveBeenCalledTimes(1)
    const refreshed = { ...h.view, buckets: h.view.buckets.map((bucket, index) => index === 0
      ? { ...bucket, values: { ...bucket.values, uncategorized: { ...bucket.values.uncategorized, count: 1 } } } : bucket) }
    await h.render(refreshed)
    expect(availability).toHaveBeenCalledTimes(2)
    expect((renderer.props!.data as presentation.TrendPlotDatum[]).some((datum) => datum.key === 'uncategorized')).toBe(true)
    await h.render(refreshed, true)
    expect(h.host.querySelector('[data-trend-viewport]')).toBeNull()
    expect(h.host.textContent).toContain('Parent feedback')
    await h.render(refreshed)
    await h.press('ArrowRight')
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '0' } } })
  })
})
const config: LineConfig = { scale: { x: { domain: Array.from({ length: 10 }, (_, index) => String(index)) } } }
async function setup(strict = false) {
  const host = document.createElement('div'); document.body.append(host)
  const caught = vi.fn()
  const root = createRoot(host, { onCaughtError: caught }); mounted.push({ root, host })
  const render = async (next = config, interactionKey = "fixture") => { await act(async () => root.render(strict ? <StrictMode><button>Surrounding controls</button><TrendPlotViewport config={next} interactionKey={interactionKey} /></StrictMode> : <><button>Surrounding controls</button><TrendPlotViewport config={next} interactionKey={interactionKey} /></>)) }
  await render()
  return { host, root, caught, render }
}

describe('F07 real plot viewport lifecycle (external renderer stub)', () => {
  it('F09 preserves the active keyboard bucket after equivalent config recreation', async () => {
    const h = await setup()
    const viewport = h.host.querySelector<HTMLElement>('[data-trend-viewport]')!
    viewport.focus()
    await act(async () => viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })))
    renderer.emit.mockClear()
    await h.render({ ...config, scale: { x: { domain: [...config.scale!.x!.domain!] } } })
    expect(renderer.emit).not.toHaveBeenCalled()
    await act(async () => viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '1' } } })
  })
  it('releases the first ResizeObserver on StrictMode remount and the second on unmount', async () => {
    const h = await setup(true)
    expect(observers).toHaveLength(2)
    expect(observers[0]!.disconnect).toHaveBeenCalledTimes(1)
    expect(observers[1]!.observe).toHaveBeenCalledWith(h.host.querySelector('[data-trend-viewport]'))
    await act(async () => observers[1]!.resize(200))
    const ticks = renderer.props!.axis!.x!.tickFilter as (tick: unknown, index: number) => boolean
    expect(ticks(null, 1)).toBe(false)
    expect(ticks(null, 9)).toBe(true)
    await act(async () => h.root.unmount())
    mounted.splice(mounted.findIndex((entry) => entry.root === h.root), 1)
    h.host.remove()
    expect(observers.every((observer) => observer.disconnect.mock.calls.length === 1)).toBe(true)
  })

  it('handles real keyboard/blur events and dismisses stale tooltips when bucket semantics change', async () => {
    const h = await setup()
    const viewport = h.host.querySelector<HTMLElement>('[data-trend-viewport]')!
    viewport.focus()
    await act(async () => viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })))
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:show', { nativeEvent: false, data: { data: { x: '9' } } })
    await h.render({ ...config }, "changed-period")
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:hide', { nativeEvent: false })
    renderer.emit.mockClear()
    await act(async () => viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:hide', { nativeEvent: false })
    renderer.emit.mockClear()
    await act(async () => h.host.querySelector('button')!.focus())
    expect(renderer.emit).toHaveBeenLastCalledWith('tooltip:hide', { nativeEvent: false })
  })

  it.each(['pending', 'failed'] as const)('keeps %s renderer fallback local to the viewport', async (mode) => {
    renderer.mode = mode
    const h = await setup()
    expect(h.host.querySelector('[data-plot-loading="trend"]')).not.toBeNull()
    expect(h.host.querySelector('button')!.textContent).toBe('Surrounding controls')
    if (mode === 'failed') {
      expect(h.host.textContent).toContain('Grafikni yuklab bo‘lmadi.')
      expect(h.caught).toHaveBeenCalled()
    } else {
      renderer.mode = 'ready'
      await h.render({ ...config })
      expect(h.host.querySelector('[data-renderer]')).not.toBeNull()
      expect(h.host.querySelector('[data-plot-loading]')).toBeNull()
    }
  })
})
