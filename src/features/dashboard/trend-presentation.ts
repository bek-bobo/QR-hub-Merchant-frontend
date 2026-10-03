import type { DashboardView } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'

export type TrendMode = 'amount' | 'count'

export const TREND_SERIES = [
  { key: 'total', label: 'Jami', stroke: 'stroke-chart-series-primary', fill: 'fill-chart-series-primary', swatch: 'bg-chart-series-primary', dash: undefined },
  { key: 'success', label: 'Muvaffaqiyatli', stroke: 'stroke-status-success-indicator', fill: 'fill-status-success-indicator', swatch: 'bg-status-success-indicator', dash: undefined },
  { key: 'processing', label: 'Jarayonda', stroke: 'stroke-status-warning-indicator', fill: 'fill-status-warning-indicator', swatch: 'bg-status-warning-indicator', dash: '6 3' },
  { key: 'failed', label: 'Muvaffaqiyatsiz', stroke: 'stroke-status-error-indicator', fill: 'fill-status-error-indicator', swatch: 'bg-status-error-indicator', dash: '3 3' },
] as const

function scaleCeiling(values: readonly bigint[]): bigint {
  const maximum = values.reduce((max, value) => value > max ? value : max, 0n)
  return (maximum === 0n ? 1n : (maximum + 3n) / 4n) * 4n
}

export function projectTrend(view: Pick<DashboardView, 'buckets'>, mode: TrendMode) {
  const seriesValues = TREND_SERIES.map((definition) => ({
    ...definition,
    amounts: view.buckets.map(({ values }) => BigInt(values[definition.key].amount.minorUnits)),
    counts: view.buckets.map(({ values }) => BigInt(values[definition.key].count)),
  }))
  const amountCeiling = scaleCeiling(seriesValues.flatMap(({ amounts }) => amounts))
  const countCeiling = scaleCeiling(seriesValues.flatMap(({ counts }) => counts))
  const ceiling = mode === 'amount' ? amountCeiling : countCeiling
  // Integer ticks keep counts integral and money in exact minor units.
  const step = ceiling / 4n
  const tickValues = Array.from({ length: 5 }, (_, index) => step * BigInt(index))
  const tickLabels = tickValues.map((value) => mode === 'amount'
    ? formatMoney({ minorUnits: String(value), currency: 'UZS', scale: 2 })
    : value.toLocaleString('uz-UZ'))
  // Reserve space for either mode so switching does not resize the chart.
  const widestLabels = [
    ...tickLabels,
    formatMoney({ minorUnits: String(amountCeiling), currency: 'UZS', scale: 2 }),
    countCeiling.toLocaleString('uz-UZ'),
  ]
  const left = Math.max(72, ...widestLabels.map((label) => label.length * 7 + 16))
  const right = 24
  // Preserve at least the original drawable width; scrolling belongs to the chart.
  const width = left + 592 + right
  const height = 220
  const top = 20
  const bottom = 180
  const yFor = (value: bigint) => bottom - Number((value * 10_000n) / ceiling) / 10_000 * (bottom - top)
  const series = seriesValues.map((definition) => {
    const values = mode === 'amount' ? definition.amounts : definition.counts
    const points = view.buckets.map((bucket, index) => ({
      period: bucket.label,
      count: bucket.values[definition.key].count,
      amount: bucket.values[definition.key].amount,
      value: values[index] ?? 0n,
      x: view.buckets.length <= 1 ? left + 296 : left + index / (view.buckets.length - 1) * 592,
      y: yFor(values[index] ?? 0n),
    }))
    return { ...definition, points, polyline: points.map(({ x, y }) => `${x},${y}`).join(' ') }
  })
  const points = series[0]?.points ?? []
  // At most five evenly spaced labels, always including both endpoints.
  const labelCount = Math.min(5, points.length)
  const labelIndexes = Array.from({ length: labelCount }, (_, index) => labelCount === 1
    ? 0 : Math.round(index * (points.length - 1) / (labelCount - 1)))
  return {
    width, height, left, right, bottom, points, series,
    ticks: tickValues.map((value, index) => ({ value, label: tickLabels[index] ?? '', y: yFor(value) })),
    xLabels: labelIndexes.flatMap((index) => {
      const point = points[index]
      return point ? [{ ...point, index }] : []
    }),
  }
}
