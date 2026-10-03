import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DashboardView } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import { projectTrend, TREND_SERIES, type TrendMode } from './trend-presentation'

interface TrendChartProps {
  readonly view: DashboardView
}

export function TrendChart({ view }: TrendChartProps) {
  const [mode, setMode] = useState<TrendMode>('amount')
  const { width, height, left, right, bottom, points, series, ticks, xLabels } = projectTrend(view, mode)

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{mode === 'amount' ? 'Summa dinamikasi' : 'Soni dinamikasi'}</CardTitle>
          <p className="mt-1 text-xs text-text-secondary">
            {mode === 'amount' ? 'Summa (UZS)' : 'Tranzaksiyalar soni'}
          </p>
        </div>
        <div role="group" aria-label="Trend ko‘rinishi" className="flex flex-wrap gap-1">
          {(['amount', 'count'] as const).map((option) => (
            <Button key={option} type="button" variant="outline" size="sm"
              aria-pressed={mode === option}
              className="aria-pressed:bg-muted aria-pressed:text-text-primary aria-pressed:font-semibold"
              onClick={() => setMode(option)}>
              {option === 'amount' ? 'Summa' : 'Soni'}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5">
        <ul aria-label="Trend qatorlari" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
          {TREND_SERIES.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <span aria-hidden="true" className={`h-1 w-4 shrink-0 rounded-full ${item.swatch}`} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        {points.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-text-secondary">
            Tanlangan davr uchun trend nuqtalari mavjud emas.
          </p>
        ) : (
          <div className="min-w-0 max-w-full overflow-x-auto" aria-hidden="true">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-56 w-full"
              style={{ minWidth: width }}
              preserveAspectRatio="none"
            >
              {ticks.map((tick) => (
                <g key={String(tick.value)}>
                  <line x1={left} y1={tick.y} x2={width - right} y2={tick.y}
                    className={tick.value === 0n ? 'stroke-chart-axis' : 'stroke-chart-grid'}
                    strokeOpacity={tick.value === 0n ? 1 : 0.6} vectorEffect="non-scaling-stroke" />
                  <text x={left - 12} y={tick.y} textAnchor="end" dominantBaseline="middle"
                    className="fill-text-secondary text-[11px]">{tick.label}</text>
                </g>
              ))}
              {xLabels.map((point) => (
                <text key={point.index} x={point.x} y={bottom + 24}
                  textAnchor={points.length === 1 ? 'middle' : point.index === 0 ? 'start' : point.index === points.length - 1 ? 'end' : 'middle'}
                  className="fill-text-secondary text-[11px]">
                  <title>{point.period}</title>
                  {point.period.length > 16 ? `${point.period.slice(0, 15)}…` : point.period}
                </text>
              ))}
              {series.map((item) => (
                <g key={item.key}>
                  {item.points.length > 1 ? (
                    <polyline
                      points={item.polyline}
                      fill="none"
                      className={item.stroke}
                      strokeWidth={item.key === 'total' ? 3 : 2}
                      strokeDasharray={item.dash}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {item.points.map((point) => (
                    <circle
                      key={`${point.period}-${point.x}`}
                      cx={point.x}
                      cy={point.y}
                      r={item.key === 'total' ? 5 : 3}
                      className={item.fill}
                      vectorEffect="non-scaling-stroke"
                    >
                      <title>{`${point.period} · ${item.label}: ${mode === 'amount' ? formatMoney(point.amount) : point.count.toLocaleString('uz-UZ')}`}</title>
                    </circle>
                  ))}
                </g>
              ))}
            </svg>
          </div>
        )}

        <TableScrollRegion ariaLabel="Trendning aniq qiymatlari">
          <Table className="min-w-[58rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Davr</TableHead>
                {TREND_SERIES.map((item) => <TableHead key={item.key} className="text-right">{item.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.buckets.map((bucket, index) => (
                <TableRow key={`${bucket.label}-${index}`}>
                  <TableCell>{bucket.label}</TableCell>
                  {TREND_SERIES.map((item) => (
                    <TableCell key={item.key} className="text-right tabular-nums">
                      <p><span className="text-text-secondary">Soni: </span>{bucket.values[item.key].count.toLocaleString('uz-UZ')}</p>
                      <p className="mt-1"><span className="text-text-secondary">Summa: </span>{formatMoney(bucket.values[item.key].amount)}</p>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScrollRegion>
      </CardContent>
    </Card>
  )
}
