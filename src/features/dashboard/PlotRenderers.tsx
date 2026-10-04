import { Line, Pie, type LineConfig, type PieConfig } from '@ant-design/plots'

export function TrendLinePlotRenderer(props: LineConfig) {
  return <Line {...props} />
}

export function StatusPiePlotRenderer(props: PieConfig) {
  return <Pie {...props} />
}
