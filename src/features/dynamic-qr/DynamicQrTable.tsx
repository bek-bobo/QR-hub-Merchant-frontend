import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import {
  DYNAMIC_QR_DEFAULT_COLUMN_ORDER,
  dynamicQrColumns,
  type DynamicQrColumn,
  type DynamicQrColumnId,
} from './columns'
import { DynamicQrActionsMenu } from './DynamicQrActionsMenu'

interface DynamicQrTableProps {
  readonly rows: readonly DynamicQrRow[]
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onViewQr: (row: DynamicQrRow) => void
  readonly onViewDetails: (row: DynamicQrRow) => void
}

function resolveColumns(
  order: readonly string[],
  visibleColumnIds: readonly string[],
): readonly DynamicQrColumn[] {
  const normalized = normalizeColumnOrder({
    defaultOrder: DYNAMIC_QR_DEFAULT_COLUMN_ORDER,
    savedOrder: order,
  })
  const visible = new Set(visibleColumnIds)
  const byId = new Map(dynamicQrColumns.map((column) => [column.id, column] as const))
  return normalized.filter((id) => visible.has(id)).flatMap((id) => {
    const column = byId.get(id as DynamicQrColumnId)
    return column ? [column] : []
  })
}

interface DynamicQrTableContentProps extends Omit<DynamicQrTableProps, 'columnOrder'> {
  readonly columnOrder: readonly string[]
}

export function DynamicQrTableContent({
  rows,
  columnOrder,
  visibleColumnIds,
  onViewQr,
  onViewDetails,
}: DynamicQrTableContentProps) {
  const columns = resolveColumns(columnOrder, visibleColumnIds)

  return (
    <Table className="min-w-[60rem]">
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={column.headerClassName}>
              {column.label}
            </TableHead>
          ))}
          <TableHead className="sticky right-0 w-16 bg-surface text-right">Amallar</TableHead>
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
            <TableCell className="sticky right-0 bg-surface text-right">
              <DynamicQrActionsMenu row={row} onViewQr={onViewQr} onViewDetails={onViewDetails} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function DynamicQrTable({
  rows,
  columnOrder,
  visibleColumnIds,
  onViewQr,
  onViewDetails,
}: DynamicQrTableProps) {
  return (
    <TableScrollRegion ariaLabel="Dinamik QR ro‘yxati">
      <DynamicQrTableContent rows={rows} columnOrder={columnOrder} visibleColumnIds={visibleColumnIds}
        onViewQr={onViewQr} onViewDetails={onViewDetails} />
    </TableScrollRegion>
  )
}
