import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { LineConfig } from '@ant-design/plots'
import { TrendLinePlotRenderer } from './LazyPlotRenderers'
import { PlotViewportBoundary } from './PlotViewportBoundary'
import { TrendEntryRamps } from './TrendEntryRamps'
import { createTrendEntryRamps, type RampProjection, type TrendEntryRamp } from './trend-entry-ramps'
import type { TrendPlotDatum } from './trend-presentation'

interface RampPlot {
  readonly container: HTMLElement
  readonly chart: {
    getScale(): { x?: RampProjection['x']; y?: RampProjection['y'] } | undefined
    getCoordinate(): RampProjection['coordinate'] | undefined
    getView(): { layout: { x?: number; y?: number; paddingLeft?: number; paddingTop?: number; marginLeft?: number; marginTop?: number } } | undefined
    on(event: string, listener: () => void): unknown
    off(event: string, listener: () => void): unknown
    emit(event: string, payload: { nativeEvent: boolean }): unknown
  }
}

interface RampSnapshot {
  readonly config: LineConfig
  readonly ramps: readonly TrendEntryRamp[]
  readonly width: number
  readonly height: number
}

export function TrendPlotViewport({ config }: { readonly config: LineConfig }) {
  const currentConfig = useRef(config)
  const plot = useRef<RampPlot | null>(null)
  const unsubscribe = useRef<(() => void) | undefined>(undefined)
  const [snapshot, setSnapshot] = useState<RampSnapshot | null>(null)
  useLayoutEffect(() => { currentConfig.current = config }, [config])
  useEffect(() => () => { unsubscribe.current?.(); plot.current = null }, [])

  const onReady = useCallback<NonNullable<LineConfig['onReady']>>((instance) => {
    unsubscribe.current?.()
    const ready = instance as RampPlot
    plot.current = ready
    const update = () => {
      const scales = ready.chart.getScale()
      const coordinate = ready.chart.getCoordinate()
      const view = ready.chart.getView()
      if (!scales?.x || !scales.y || !coordinate || !view) return
      const latest = currentConfig.current
      const { layout } = view
      const ramps = createTrendEntryRamps(latest.data as TrendPlotDatum[], latest.scale?.color?.range as string[], {
        x: scales.x, y: scales.y, coordinate,
        offsetX: (layout.x ?? 0) + (layout.paddingLeft ?? 0) + (layout.marginLeft ?? 0),
        offsetY: (layout.y ?? 0) + (layout.paddingTop ?? 0) + (layout.marginTop ?? 0),
      })
      setSnapshot({ config: latest, ramps, width: ready.container.clientWidth, height: ready.container.clientHeight })
    }
    ready.chart.on('afterrender', update)
    ready.chart.on('afterchangesize', update)
    unsubscribe.current = () => {
      ready.chart.off('afterrender', update)
      ready.chart.off('afterchangesize', update)
    }
    currentConfig.current.onReady?.(instance)
  }, [])

  // Measuring an overlay must not rerender the plot and trigger another render
  // event. Keep the engine subtree stable until its real config changes.
  const visualPlot = useMemo(() => (
    <PlotViewportBoundary fallback={<div data-plot-loading="trend" className="h-80 w-full rounded-lg bg-muted/40 motion-safe:animate-pulse" />}>
      <TrendLinePlotRenderer {...config} onReady={onReady} />
    </PlotViewportBoundary>
  ), [config, onReady])

  const current = snapshot?.config === config ? snapshot : null
  function suppressGutterHover(event: PointerEvent<HTMLDivElement>) {
    if (!current || current.ramps.length === 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width <= 0) return
    const x = (event.clientX - bounds.left) * current.width / bounds.width
    if (current.ramps.some((ramp) => x >= ramp.start[0] && x < ramp.end[0])) {
      event.stopPropagation()
      plot.current?.chart.emit('tooltip:hide', { nativeEvent: false })
    }
  }

  return <div className="relative min-w-0 w-full" onPointerMoveCapture={suppressGutterHover}>
    {visualPlot}
    {current ? <TrendEntryRamps ramps={current.ramps} width={current.width} height={current.height} /> : null}
  </div>
}
