export interface PreviewQrRow {
  demoId: string
  terminalName: string
  createdAtLabel: string
  demoAmountTiyin: number
  statusCode: number
}

export interface PreviewMetric {
  count: number
  amountTiyin: number
}

export interface DashboardPreview {
  periodLabel: string
  total: PreviewMetric
  success: PreviewMetric
  processing: PreviewMetric
  failed: PreviewMetric
  rows: readonly PreviewQrRow[]
}
