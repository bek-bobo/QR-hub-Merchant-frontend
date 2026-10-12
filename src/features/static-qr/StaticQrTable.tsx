import { useStaticQrPresentation } from './presentation'
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
  createStaticQrColumns,
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
  staticQrColumns: ReturnType<typeof createStaticQrColumns>,
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
  const p = useStaticQrPresentation()
  const staticQrColumns = createStaticQrColumns(p)
  const columns = resolveColumns(staticQrColumns, columnOrder, visibleColumnIds)
  const columnWidths: Record<StaticQrColumnId, number> = {
    qrId: 320,
    terminal: 240,
    merchant: 240,
    status: 144,
  }
  const actionsWidth = 96
  const totalWidth = columns.reduce((width, column) => width + columnWidths[column.id], actionsWidth)

  return (
    <Table className="static-qr-table table-fixed" style={{ minWidth: totalWidth }}>
      <colgroup>
        {columns.map((column) => <col key={column.id} style={{ width: `calc((100% - ${actionsWidth}px) * ${columnWidths[column.id] / (totalWidth - actionsWidth)})` }} />)}
        <col style={{ width: actionsWidth }} />
      </colgroup>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id}>{column.label}</TableHead>
          ))}
          <TableHead className="sticky right-0 text-right">{p.message('table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            {columns.map((column) => (
              <TableCell key={column.id} className={column.id === 'terminal' || column.id === 'merchant' ? 'whitespace-normal break-words' : undefined}>{column.renderCell(row)}</TableCell>
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
