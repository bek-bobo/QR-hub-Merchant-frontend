import type { DynamicQrPresentation } from './presentation'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
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

export function createDynamicQrColumns(p: DynamicQrPresentation) { return [
  {
    id: 'merchant',
    label: p.message('table.merchant'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => presentNullableCell(row.merchantName),
  },
  {
    id: 'createdAt',
    label: p.message('table.createdAt'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => p.wallTime(row.createdAt),
  },
  {
    id: 'terminal',
    label: p.message('table.terminal'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => presentNullableCell(row.terminalName),
  },
  {
    id: 'qrId',
    label: p.message('table.qrId'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => <MetadataId value={row.pkey} className="max-w-none whitespace-normal break-all" />,
  },
  {
    id: 'amount',
    label: p.message('table.amount'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    headerClassName: 'text-right',
    cellClassName: 'text-right tabular-nums',
    renderCell: (row: DynamicQrRow) => formatMoney(row.amount),
  },
  {
    id: 'status',
    label: p.message('table.status'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => {
      const status = p.status(row.statusCode)
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
    label: p.message('table.rrn'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: DynamicQrRow) => presentNullableCell(row.rrn),
  },
] as const satisfies readonly DynamicQrColumnDefinition[]
}

export type DynamicQrColumnId =
  ReturnType<typeof createDynamicQrColumns>[number]['id']
export type DynamicQrColumn = DynamicQrColumnDefinition & {
  readonly id: DynamicQrColumnId
}

export const DYNAMIC_QR_DEFAULT_COLUMN_ORDER: readonly DynamicQrColumnId[] = ['merchant', 'createdAt', 'terminal', 'qrId', 'amount', 'status', 'rrn']
