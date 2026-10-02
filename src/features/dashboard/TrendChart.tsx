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
import { projectAmountTrend } from './presenters'

interface TrendChartProps {
  readonly view: DashboardView
}

export function TrendChart({ view }: TrendChartProps) {
  const width = 640
  const height = 220
  const points = projectAmountTrend(view, view.chartGroupBy, width, height)
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Jami summa dinamikasi</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5">
        {points.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-text-secondary">
            Tanlangan davr uchun trend nuqtalari mavjud emas.
          </p>
        ) : (
          <div className="overflow-x-auto" aria-hidden="true">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-56 min-w-[36rem] w-full"
              preserveAspectRatio="none"
            >
              <line
                x1="24"
                y1={height - 20}
                x2={width - 24}
                y2={height - 20}
                className="stroke-chart-axis"
              />
              {points.length > 1 ? (
                <polyline
                  points={polyline}
                  fill="none"
                  className="stroke-chart-series-primary"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {points.map((point) => (
                <circle
                  key={`${point.period}-${point.x}`}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  className="fill-chart-series-primary"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>
        )}

        <TableScrollRegion ariaLabel="Trendning aniq qiymatlari">
          <Table className="min-w-[34rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Davr</TableHead>
                <TableHead className="text-right">Jami soni</TableHead>
                <TableHead className="text-right">Jami summa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((point) => (
                <TableRow key={`${point.period}-${point.x}`}>
                  <TableCell>{point.period}</TableCell>
                  <TableCell className="text-right tabular-nums">{point.count.toLocaleString('uz-UZ')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(point.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScrollRegion>
      </CardContent>
    </Card>
  )
}
