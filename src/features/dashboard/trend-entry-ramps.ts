import { ALL_TREND_SERIES, type TrendPlotDatum, type TrendSeriesKey } from './trend-presentation'

export interface RampProjection {
  readonly x: { map(value: string): number }
  readonly y: { map(value: number): number }
  readonly coordinate: { map(point: number[]): number[] }
  readonly offsetX: number
  readonly offsetY: number
}

export interface TrendEntryRamp {
  readonly key: TrendSeriesKey
  readonly color: string
  readonly start: readonly [number, number]
  readonly end: readonly [number, number]
  readonly path: string
}

// Geometry only: these paths never enter the chart's data, domain or tooltip.
export function createTrendEntryRamps(data: readonly TrendPlotDatum[], colors: readonly string[], projection: RampProjection): TrendEntryRamp[] {
  if (data.length === 0) return []
  const firstBucket = data[0]!.bucket
  const firstX = projection.x.map(firstBucket)
  const zeroY = projection.y.map(0)
  const start = projection.coordinate.map([Math.max(0, firstX - 0.03), zeroY])
  return ALL_TREND_SERIES.flatMap((key, index) => {
    const first = data.find((datum) => datum.bucket === firstBucket && datum.key === key)
    if (!first || !Number.isFinite(first.value) || first.value <= 0) return []
    const point = projection.coordinate.map([firstX, projection.y.map(first.value)])
    const sx = start[0]! + projection.offsetX
    const sy = start[1]! + projection.offsetY
    const ex = point[0]! + projection.offsetX
    const ey = point[1]! + projection.offsetY
    if (![sx, sy, ex, ey].every(Number.isFinite) || ex <= sx) return []
    const width = ex - sx
    return [{ key, color: colors[index]!, start: [sx, sy] as const, end: [ex, ey] as const,
      path: `M ${sx} ${sy} C ${sx + width * 0.35} ${sy}, ${sx + width * 0.75} ${ey}, ${ex} ${ey}` }]
  })
}
