import type { DashboardPresentation } from './presentation'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'

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

export function createDashboardRecentQrColumns(p: DashboardPresentation): readonly DashboardRecentQrColumn[] { return [
  {
    id: 'amount', label: p.message('recentQr.amount'), defaultVisible: true, hideable: true, reorderable: true,
    width: 144,
    cellClassName: 'tabular-nums whitespace-normal break-words',
    renderCell: (row) => formatMoney(row.amount),
  },
  {
    id: 'qrId', label: p.message('recentQr.qrId'), defaultVisible: true, hideable: true, reorderable: true,
    width: 320, flexible: true,
    renderCell: (row) => row.pkey ? <MetadataId value={row.pkey} className="max-w-none whitespace-normal break-all" /> : '—',
  },
  {
    id: 'createdAt', label: p.message('recentQr.createdAt'), defaultVisible: true, hideable: true, reorderable: true,
    width: 164,
    renderCell: (row) => p.wallTime(row.createdAt),
  },
  {
    id: 'terminal', label: p.message('recentQr.terminal'), defaultVisible: true, hideable: true, reorderable: true,
    width: 220, flexible: true,
    cellClassName: 'whitespace-normal break-words',
    renderCell: (row) => row.terminalName || '—',
  },
  {
    id: 'status', label: p.message('recentQr.status'), defaultVisible: true, hideable: true, reorderable: true,
    width: 152,
    renderCell: (row) => {
      const status = presentQrStatus(row.statusCode)
      const keys = { 0: 'qrStatus.new', 5: 'qrStatus.expired', 10: 'qrStatus.processing', 20: 'qrStatus.cancelled', 25: 'qrStatus.rejected', 50: 'qrStatus.success' } as const
      const key = Object.hasOwn(keys, row.statusCode) ? keys[row.statusCode as keyof typeof keys] : 'qrStatus.unknown'
      return <Badge variant="outline" className={`${statusToneClasses[status.tone].badge} h-auto max-w-full rounded-full px-2.5 py-1 font-medium whitespace-normal`}>{p.message(key)}</Badge>
    },
  },
]
}
