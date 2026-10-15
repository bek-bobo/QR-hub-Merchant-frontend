import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import type {
  DashboardPreview,
  PreviewMetric,
  PreviewQrRow,
} from '@/features/dashboard/model'

const previewRows = [
  {
    demoId: 'DEMO-QR-001',
    terminalName: 'Namuna terminal 01',
    createdAtLabel: formatOffsetlessDateTime('2026-09-11T09:10:00'),
    demoAmountTiyin: 1_000_000_000,
    statusCode: 50,
  },
  {
    demoId: 'DEMO-QR-002',
    terminalName: 'Namuna terminal 02',
    createdAtLabel: formatOffsetlessDateTime('2026-09-11T09:42:00'),
    demoAmountTiyin: 745_000_000,
    statusCode: 50,
  },
  {
    demoId: 'DEMO-QR-003',
    terminalName: 'Namuna terminal 03',
    createdAtLabel: formatOffsetlessDateTime('2026-09-11T10:18:00'),
    demoAmountTiyin: 500_000_000,
    statusCode: 50,
  },
  {
    demoId: 'DEMO-QR-004',
    terminalName: 'Namuna terminal 04',
    createdAtLabel: formatOffsetlessDateTime('2026-09-11T11:05:00'),
    demoAmountTiyin: 100_000_000,
    statusCode: 10,
  },
  {
    demoId: 'DEMO-QR-005',
    terminalName: 'Namuna terminal 05',
    createdAtLabel: formatOffsetlessDateTime('2026-09-11T11:47:00'),
    demoAmountTiyin: 100_000_000,
    statusCode: 0,
  },
  {
    demoId: 'DEMO-QR-006',
    terminalName: 'Namuna terminal 06',
    createdAtLabel: formatOffsetlessDateTime('2026-09-11T12:26:00'),
    demoAmountTiyin: 30_000_000,
    statusCode: 20,
  },
  {
    demoId: 'DEMO-QR-007',
    terminalName: 'Namuna terminal 07',
    createdAtLabel: formatOffsetlessDateTime('2026-09-11T13:03:00'),
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
