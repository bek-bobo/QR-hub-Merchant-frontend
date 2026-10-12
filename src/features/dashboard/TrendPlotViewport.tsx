import { useDashboardPresentation } from './presentation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { LineConfig } from '@ant-design/plots'
import { TrendLinePlotRenderer } from './LazyPlotRenderers'
import { PlotViewportBoundary } from './PlotViewportBoundary'
import { trendTickFilter } from './trend-presentation'
import './trend-tooltip.css'

type ActivePlot = { chart: {
  emit(event: string, payload: unknown): unknown
  on?(event: string, callback: () => void): unknown
  off?(event: string, callback: () => void): unknown
} }
export function TrendPlotViewport({ config, interactionKey }: { readonly config: LineConfig; readonly interactionKey: string }) {
  const p = useDashboardPresentation()
  const container = useRef<HTMLDivElement>(null)
  const plot = useRef<ActivePlot | null>(null)
  const active = useRef(-1)
  const refreshTooltip = useRef(false)
  const [width, setWidth] = useState(720)
  const afterRender = useCallback(() => {
    if (!refreshTooltip.current) return
    refreshTooltip.current = false
    if (active.current >= 0 && container.current?.contains(document.activeElement)) {
      plot.current?.chart.emit('tooltip:show', { nativeEvent: false, data: { data: { x: String(active.current) } } })
    }
  }, [])
  const onReady = useCallback<NonNullable<LineConfig['onReady']>>((instance) => { // Ant Design supplies its Plot instance here; its callback declaration names G2 Chart.
    plot.current?.chart.off?.('afterrender', afterRender)
    plot.current = instance as unknown as ActivePlot
    // The Plot proxy drops lifecycle events without payloads. Subscribe to the
    // installed G2 chart's lifecycle event directly and release it on cleanup.
    plot.current.chart.on?.('afterrender', afterRender)
  }, [afterRender])
  useEffect(() => () => { plot.current?.chart.off?.('afterrender', afterRender) }, [afterRender])
  const count = config.scale?.x?.domain?.length ?? 0
  useEffect(() => {
    const element = container.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  function hide() { active.current = -1; refreshTooltip.current = false; plot.current?.chart.emit('tooltip:hide', { nativeEvent: false }) }
  useEffect(() => { hide() }, [interactionKey])
  useLayoutEffect(() => {
    // G2 renders asynchronously and clears its tooltip during config updates.
    // Reopen only after it has installed the new localized datum callbacks.
    refreshTooltip.current = active.current >= 0
  }, [p.locale])
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (!count || !['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Escape') { hide(); return }
    active.current = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : Math.max(0, Math.min(count - 1, active.current + (event.key === 'ArrowLeft' ? -1 : 1)))
    plot.current?.chart.emit('tooltip:show', { nativeEvent: false, data: { data: { x: String(active.current) } } })
  }
  // G2 compares callback references too. Reuse responsive axis/area options so
  // an unrelated rerender does not manufacture a new tickFilter/update.
  const axis = useMemo(() => ({ ...config.axis, x: { ...config.axis?.x, tickFilter: trendTickFilter(count, width) } }), [config.axis, count, width])
  const area = useMemo(() => config.area ? { ...config.area, axis } : config.area, [config.area, axis])
  return <div ref={container} className="relative min-w-0 w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    data-trend-viewport tabIndex={0} role="group" aria-label={p.message('trend.keyboard')}
    onKeyDown={navigate} onBlur={hide}>
    <PlotViewportBoundary fallback={<div data-plot-loading="trend" className="h-80 w-full rounded-lg bg-muted/40 motion-safe:animate-pulse" />}>
      <TrendLinePlotRenderer {...config} onReady={onReady} axis={axis} area={area} />
    </PlotViewportBoundary>
  </div>
}
