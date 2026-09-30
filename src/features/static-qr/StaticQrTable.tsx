import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import type { StaticQrRow } from './contract'
import {
  STATIC_QR_DEFAULT_COLUMN_ORDER,
  staticQrColumns,
  type StaticQrColumn,
  type StaticQrColumnId,
} from './columns'
import { StaticQrActionsMenu } from './StaticQrActionsMenu'

interface StaticQrTableProps {
  readonly rows: readonly StaticQrRow[]
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onViewQr: (row: StaticQrRow) => void
  readonly onViewDetails: (row: StaticQrRow) => void
}

function resolveColumns(
  order: readonly string[],
  visibleColumnIds: readonly string[],
): readonly StaticQrColumn[] {
  const normalized = normalizeColumnOrder({
    defaultOrder: STATIC_QR_DEFAULT_COLUMN_ORDER,
    savedOrder: order,
  })
  const visible = new Set(visibleColumnIds)
  const byId = new Map(staticQrColumns.map((column) => [column.id, column] as const))
  return normalized.filter((id) => visible.has(id)).flatMap((id) => {
    const column = byId.get(id as StaticQrColumnId)
    return column ? [column] : []
  })
}

export function StaticQrTable({
  rows,
  columnOrder,
  visibleColumnIds,
  onViewQr,
  onViewDetails,
}: StaticQrTableProps) {
  const columns = resolveColumns(columnOrder, visibleColumnIds)

  return (
    <Table className="min-w-[38rem]">
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id}>{column.label}</TableHead>
          ))}
          <TableHead className="sticky right-0 w-16 bg-surface text-right">Amallar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            {columns.map((column) => (
              <TableCell key={column.id}>{column.renderCell(row)}</TableCell>
            ))}
            <TableCell className="sticky right-0 bg-surface text-right">
              <StaticQrActionsMenu row={row} onViewQr={onViewQr} onViewDetails={onViewDetails} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
