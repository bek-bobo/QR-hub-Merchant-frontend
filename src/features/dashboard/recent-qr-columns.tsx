import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'
import { presentQrStatus } from '@/shared/presentation/qr-status'

export const DASHBOARD_RECENT_QR_TABLE_KEY = 'dashboardRecentQr'

interface DashboardRecentQrColumn extends TableColumnDefinition {
  readonly width: number
  readonly flexible?: boolean
  readonly headerClassName?: string
  readonly cellClassName?: string
  readonly renderCell: (row: DynamicQrRow) => ReactNode
}

export const dashboardRecentQrColumns: readonly DashboardRecentQrColumn[] = [
  {
    id: 'amount', label: 'Summa', defaultVisible: true, hideable: true, reorderable: true,
    width: 144,
    cellClassName: 'tabular-nums whitespace-normal break-words',
    renderCell: (row) => formatMoney(row.amount),
  },
  {
    id: 'qrId', label: 'QR ID', defaultVisible: true, hideable: true, reorderable: true,
    width: 320, flexible: true,
    renderCell: (row) => row.pkey ? <MetadataId value={row.pkey} className="max-w-none whitespace-normal break-all" /> : '—',
  },
  {
    id: 'createdAt', label: 'Vaqt', defaultVisible: true, hideable: true, reorderable: true,
    width: 164,
    renderCell: (row) => formatOffsetlessDateTime(row.createdAt),
  },
  {
    id: 'terminal', label: 'Terminal', defaultVisible: true, hideable: true, reorderable: true,
    width: 220, flexible: true,
    cellClassName: 'whitespace-normal break-words',
    renderCell: (row) => row.terminalName || '—',
  },
  {
    id: 'status', label: 'Status', defaultVisible: true, hideable: true, reorderable: true,
    width: 152,
    renderCell: (row) => {
      const status = presentQrStatus(row.statusCode)
      return <Badge variant="outline" className={`${statusToneClasses[status.tone].badge} h-auto max-w-full rounded-full px-2.5 py-1 font-medium whitespace-normal`}>{status.label}</Badge>
    },
  },
]
