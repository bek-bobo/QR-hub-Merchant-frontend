import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { LineConfig } from '@ant-design/plots'
import { TrendLinePlotRenderer } from './LazyPlotRenderers'
import { PlotViewportBoundary } from './PlotViewportBoundary'
import { trendTickFilter } from './trend-presentation'
import './trend-tooltip.css'

type ActivePlot = { chart: { emit(event: string, payload: unknown): unknown } }
export function TrendPlotViewport({ config }: { readonly config: LineConfig }) {
  const container = useRef<HTMLDivElement>(null)
  const plot = useRef<ActivePlot | null>(null)
  const active = useRef(-1)
  const [width, setWidth] = useState(720)
  const onReady = useCallback<NonNullable<LineConfig['onReady']>>((instance) => { // Ant Design supplies its Plot instance here; its callback declaration names G2 Chart.
    plot.current = instance as unknown as ActivePlot }, [])
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
  function hide() { active.current = -1; plot.current?.chart.emit('tooltip:hide', { nativeEvent: false }) }
  useEffect(() => { hide() }, [config])
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (!count || !['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Escape') { hide(); return }
    active.current = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : Math.max(0, Math.min(count - 1, active.current + (event.key === 'ArrowLeft' ? -1 : 1)))
    plot.current?.chart.emit('tooltip:show', { nativeEvent: false, data: { data: { x: String(active.current) } } })
  }
  const axis = { ...config.axis, x: { ...config.axis?.x, tickFilter: trendTickFilter(count, width) } }
  return <div ref={container} className="relative min-w-0 w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    data-trend-viewport tabIndex={0} role="group" aria-label="Grafik davrlari: chap va o‘ng tugmalar bilan ko‘rish"
    onKeyDown={navigate} onBlur={hide}>
    <PlotViewportBoundary fallback={<div data-plot-loading="trend" className="h-80 w-full rounded-lg bg-muted/40 motion-safe:animate-pulse" />}>
      <TrendLinePlotRenderer {...config} onReady={onReady} axis={axis} area={config.area ? { ...config.area, axis } : config.area} />
    </PlotViewportBoundary>
  </div>
}
