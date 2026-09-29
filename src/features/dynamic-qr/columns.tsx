import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { presentQrStatus } from '@/features/dashboard/presenters'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { presentNullableCell } from './page-state'

interface DynamicQrColumnDefinition {
  readonly id: string
  readonly label: string
  readonly headerClassName?: string
  readonly cellClassName?: string
  readonly renderCell: (row: DynamicQrRow) => ReactNode
}

const dynamicQrColumnDefinitions = [
  {
    id: 'qrId',
    label: 'QR ID',
    renderCell: (row: DynamicQrRow) => <MetadataId value={row.pkey} />,
  },
  {
    id: 'createdAt',
    label: 'Yaratilgan vaqt',
    renderCell: (row: DynamicQrRow) => formatOffsetlessDateTime(row.createdAt),
  },
  {
    id: 'terminal',
    label: 'Terminal',
    renderCell: (row: DynamicQrRow) => presentNullableCell(row.terminalName),
  },
  {
    id: 'merchant',
    label: 'Merchant',
    renderCell: (row: DynamicQrRow) => presentNullableCell(row.merchantName),
  },
  {
    id: 'amount',
    label: 'Summa',
    headerClassName: 'text-right',
    cellClassName: 'text-right tabular-nums',
    renderCell: (row: DynamicQrRow) => formatMoney(row.amount),
  },
  {
    id: 'status',
    label: 'Status',
    renderCell: (row: DynamicQrRow) => {
      const status = presentQrStatus(row.statusCode)
      return (
        <Badge variant="outline" className={statusToneClasses[status.tone].badge}>
          {status.label}
        </Badge>
      )
    },
  },
  {
    id: 'rrn',
    label: 'RRN',
    renderCell: (row: DynamicQrRow) => presentNullableCell(row.rrn),
  },
] as const satisfies readonly DynamicQrColumnDefinition[]

export type DynamicQrColumnId =
  (typeof dynamicQrColumnDefinitions)[number]['id']
export type DynamicQrColumn = DynamicQrColumnDefinition & {
  readonly id: DynamicQrColumnId
}

export const dynamicQrColumns: readonly DynamicQrColumn[] =
  dynamicQrColumnDefinitions

export const DYNAMIC_QR_DEFAULT_COLUMN_ORDER: readonly DynamicQrColumnId[] =
  dynamicQrColumnDefinitions.map((column) => column.id)
