import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'
import { presentQrStatus } from './presenters'

export const DASHBOARD_RECENT_QR_TABLE_KEY = 'dashboardRecentQr'

interface DashboardRecentQrColumn extends TableColumnDefinition {
  readonly headerClassName?: string
  readonly cellClassName?: string
  readonly renderCell: (row: DynamicQrRow) => ReactNode
}

export const dashboardRecentQrColumns: readonly DashboardRecentQrColumn[] = [
  {
    id: 'qrId', label: 'QR ID', defaultVisible: true, hideable: true, reorderable: true,
    renderCell: (row) => row.pkey ? <MetadataId value={row.pkey} /> : '—',
  },
  {
    id: 'createdAt', label: 'Vaqt', defaultVisible: true, hideable: true, reorderable: true,
    renderCell: (row) => formatOffsetlessDateTime(row.createdAt),
  },
  {
    id: 'terminal', label: 'Terminal', defaultVisible: true, hideable: true, reorderable: true,
    renderCell: (row) => row.terminalName || '—',
  },
  {
    id: 'amount', label: 'Summa', defaultVisible: true, hideable: true, reorderable: true,
    headerClassName: 'text-right', cellClassName: 'text-right tabular-nums',
    renderCell: (row) => formatMoney(row.amount),
  },
  {
    id: 'status', label: 'Status', defaultVisible: true, hideable: true, reorderable: true,
    renderCell: (row) => {
      const status = presentQrStatus(row.statusCode)
      return <Badge variant="outline" className={statusToneClasses[status.tone].badge}>{status.label}</Badge>
    },
  },
]
