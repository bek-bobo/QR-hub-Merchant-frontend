import type {
  DashboardPreview,
  PreviewMetric,
  PreviewQrRow,
} from '@/features/dashboard/model'

const previewRows = [
  {
    demoId: 'DEMO-QR-001',
    terminalName: 'Namuna terminal 01',
    createdAtLabel: '11 sentabr, 2026 · 09:10',
    demoAmountTiyin: 1_000_000_000,
    statusCode: 50,
  },
  {
    demoId: 'DEMO-QR-002',
    terminalName: 'Namuna terminal 02',
    createdAtLabel: '11 sentabr, 2026 · 09:42',
    demoAmountTiyin: 745_000_000,
    statusCode: 50,
  },
  {
    demoId: 'DEMO-QR-003',
    terminalName: 'Namuna terminal 03',
    createdAtLabel: '11 sentabr, 2026 · 10:18',
    demoAmountTiyin: 500_000_000,
    statusCode: 50,
  },
  {
    demoId: 'DEMO-QR-004',
    terminalName: 'Namuna terminal 04',
    createdAtLabel: '11 sentabr, 2026 · 11:05',
    demoAmountTiyin: 100_000_000,
    statusCode: 10,
  },
  {
    demoId: 'DEMO-QR-005',
    terminalName: 'Namuna terminal 05',
    createdAtLabel: '11 sentabr, 2026 · 11:47',
    demoAmountTiyin: 100_000_000,
    statusCode: 0,
  },
  {
    demoId: 'DEMO-QR-006',
    terminalName: 'Namuna terminal 06',
    createdAtLabel: '11 sentabr, 2026 · 12:26',
    demoAmountTiyin: 30_000_000,
    statusCode: 20,
  },
  {
    demoId: 'DEMO-QR-007',
    terminalName: 'Namuna terminal 07',
    createdAtLabel: '11 sentabr, 2026 · 13:03',
    demoAmountTiyin: 10_000_000,
    statusCode: 5,
  },
] as const satisfies readonly PreviewQrRow[]

function deriveMetric(
  rows: readonly PreviewQrRow[],
  includes: (statusCode: number) => boolean,
): PreviewMetric {
  return rows.reduce<PreviewMetric>(
    (metric, row) =>
      includes(row.statusCode)
        ? {
            count: metric.count + 1,
            amountTiyin: metric.amountTiyin + row.demoAmountTiyin,
          }
        : metric,
    { count: 0, amountTiyin: 0 },
  )
}

export const dashboardPreview: DashboardPreview = {
  periodLabel: '11 sentabr, 2026',
  total: deriveMetric(previewRows, () => true),
  success: deriveMetric(previewRows, (statusCode) => statusCode === 50),
  processing: deriveMetric(
    previewRows,
    (statusCode) => statusCode === 0 || statusCode === 10,
  ),
  failed: deriveMetric(
    previewRows,
    (statusCode) => statusCode === 5 || statusCode === 20,
  ),
  rows: previewRows,
}
