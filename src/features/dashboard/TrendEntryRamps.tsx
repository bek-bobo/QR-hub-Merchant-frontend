import { useId } from 'react'
import type { TrendEntryRamp } from './trend-entry-ramps'

export function TrendEntryRamps({ ramps, width, height }: {
  readonly ramps: readonly TrendEntryRamp[]
  readonly width: number
  readonly height: number
}) {
  const id = useId().replace(/:/g, '')
  if (ramps.length === 0 || width <= 0 || height <= 0) return null
  return <svg aria-hidden="true" focusable="false" pointerEvents="none" data-trend-entry-ramps
    className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
    viewBox={`0 0 ${width} ${height}`}>
    <defs>
      {ramps.map((ramp) => <linearGradient key={ramp.key} id={`${id}-${ramp.key}`}
        gradientUnits="userSpaceOnUse" x1={ramp.start[0]} y1={ramp.start[1]} x2={ramp.end[0]} y2={ramp.end[1]}>
        <stop offset="0" stopColor={ramp.color} stopOpacity={0.35} />
        <stop offset="1" stopColor={ramp.color} stopOpacity={1} />
      </linearGradient>)}
    </defs>
    {ramps.map((ramp) => <path key={ramp.key} d={ramp.path} fill="none"
      stroke={`url(#${id}-${ramp.key})`} strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
  </svg>
}
