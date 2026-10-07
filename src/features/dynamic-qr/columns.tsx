import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { presentQrStatus } from '@/shared/presentation/qr-status'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'
import { presentNullableCell } from './page-state'

interface DynamicQrColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly headerClassName?: string
  readonly cellClassName?: string
  readonly renderCell: (row: DynamicQrRow) => ReactNode
}

const dynamicQrColumnDefinitions = [
  {
    id: 'merchant',
    label: 'Merchant',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => presentNullableCell(row.merchantName),
  },
  {
    id: 'createdAt',
    label: 'Yaratilgan vaqt',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => formatOffsetlessDateTime(row.createdAt),
  },
  {
    id: 'terminal',
    label: 'Terminal',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => presentNullableCell(row.terminalName),
  },
  {
    id: 'qrId',
    label: 'QR ID',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => <MetadataId value={row.pkey} className="max-w-none whitespace-normal break-all" />,
  },
  {
    id: 'amount',
    label: 'Summa',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    headerClassName: 'text-right',
    cellClassName: 'text-right tabular-nums',
    renderCell: (row: DynamicQrRow) => formatMoney(row.amount),
  },
  {
    id: 'status',
    label: 'Status',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => {
      const status = presentQrStatus(row.statusCode)
      return (
        <Badge variant="outline" className={`${statusToneClasses[status.tone].badge} gap-1.5 rounded-full px-2.5 py-1 font-medium`}>
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${statusToneClasses[status.tone].indicator}`} />
          <span>{status.label}</span>
        </Badge>
      )
    },
  },
  {
    id: 'rrn',
    label: 'RRN',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => presentNullableCell(row.rrn),
  },
] as const satisfies readonly DynamicQrColumnDefinition[]

export type DynamicQrColumnId =
  (typeof dynamicQrColumnDefinitions)[number]['id']
export type DynamicQrColumn = DynamicQrColumnDefinition & {
  readonly id: DynamicQrColumnId
}

export const dynamicQrColumns: readonly DynamicQrColumn[] = dynamicQrColumnDefinitions

export const DYNAMIC_QR_DEFAULT_COLUMN_ORDER: readonly DynamicQrColumnId[] =
  dynamicQrColumns.map((column) => column.id)
