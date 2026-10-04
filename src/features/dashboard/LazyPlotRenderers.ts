import { lazy } from 'react'

export const TrendLinePlotRenderer = lazy(() =>
  import('./PlotRenderers').then((module) => ({ default: module.TrendLinePlotRenderer })),
)

export const StatusPiePlotRenderer = lazy(() =>
  import('./PlotRenderers').then((module) => ({ default: module.StatusPiePlotRenderer })),
)
