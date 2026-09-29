import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { presentQrStatus } from '@/features/dashboard/presenters'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import { useTableColumnOrder } from '@/shared/table-columns/useTableColumnOrder'
import { TableColumnPreferences } from '@/shared/ui/TableColumnPreferences'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import {
  DYNAMIC_QR_DEFAULT_COLUMN_ORDER,
  type DynamicQrColumnId,
} from './columns'
import { presentNullableCell } from './page-state'

interface DynamicQrColumn {
  readonly id: DynamicQrColumnId
  readonly label: string
  readonly headerClassName?: string
  readonly cellClassName?: string
  readonly renderCell: (row: DynamicQrRow) => ReactNode
}

const dynamicQrColumns: readonly DynamicQrColumn[] = [
  {
    id: 'qrId',
    label: 'QR ID',
    renderCell: (row) => <MetadataId value={row.pkey} />,
  },
  {
    id: 'createdAt',
    label: 'Yaratilgan vaqt',
    renderCell: (row) => formatOffsetlessDateTime(row.createdAt),
  },
  {
    id: 'terminal',
    label: 'Terminal',
    renderCell: (row) => presentNullableCell(row.terminalName),
  },
  {
    id: 'merchant',
    label: 'Merchant',
    renderCell: (row) => presentNullableCell(row.merchantName),
  },
  {
    id: 'amount',
    label: 'Summa',
    headerClassName: 'text-right',
    cellClassName: 'text-right tabular-nums',
    renderCell: (row) => formatMoney(row.amount),
  },
  {
    id: 'status',
    label: 'Status',
    renderCell: (row) => {
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
    renderCell: (row) => presentNullableCell(row.rrn),
  },
]

interface DynamicQrTableProps {
  readonly rows: readonly DynamicQrRow[]
}

function resolveColumns(order: readonly string[]): readonly DynamicQrColumn[] {
  const normalized = normalizeColumnOrder({
    defaultOrder: DYNAMIC_QR_DEFAULT_COLUMN_ORDER,
    savedOrder: order,
  })
  const byId = new Map(dynamicQrColumns.map((column) => [column.id, column] as const))
  return normalized.flatMap((id) => {
    const column = byId.get(id as DynamicQrColumnId)
    return column ? [column] : []
  })
}

interface DynamicQrTableContentProps extends DynamicQrTableProps {
  readonly columnOrder: readonly string[]
}

export function DynamicQrTableContent({
  rows,
  columnOrder,
}: DynamicQrTableContentProps) {
  const columns = resolveColumns(columnOrder)

  return (
    <Table className="min-w-[60rem]">
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={column.headerClassName}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.pkey}>
            {columns.map((column) => (
              <TableCell key={column.id} className={column.cellClassName}>
                {column.renderCell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function DynamicQrTable({ rows }: DynamicQrTableProps) {
  const columnOrder = useTableColumnOrder({
    tableKey: 'dynamicQr',
    defaultOrder: DYNAMIC_QR_DEFAULT_COLUMN_ORDER,
  })

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex justify-end">
        <TableColumnPreferences
          tableLabel="Dinamik QR"
          items={dynamicQrColumns}
          order={columnOrder.order}
          onMoveUp={columnOrder.moveUp}
          onMoveDown={columnOrder.moveDown}
          onReset={columnOrder.reset}
        />
      </div>
      <TableScrollRegion ariaLabel="Dinamik QR ro‘yxati">
        <DynamicQrTableContent rows={rows} columnOrder={columnOrder.order} />
      </TableScrollRegion>
    </div>
  )
}
