import { useDynamicQrPresentation } from './presentation'
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
  createDynamicQrColumns,
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
  dynamicQrColumns: readonly DynamicQrColumn[],
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
  const p = useDynamicQrPresentation()
  const columns = resolveColumns(columnOrder, visibleColumnIds, createDynamicQrColumns(p))
  const widths: Record<DynamicQrColumnId, number> = {
    merchant: 150,
    createdAt: 156,
    terminal: 170,
    qrId: 280,
    amount: 125,
    status: 150,
    rrn: 96,
  }
  const actionsWidth = 76
  const totalWidth = columns.reduce((width, column) => width + widths[column.id], actionsWidth)
  const flexibleIds = new Set<DynamicQrColumnId>(['merchant', 'terminal', 'qrId'])
  const flexibleCount = columns.filter((column) => flexibleIds.has(column.id)).length

  return (
    <Table className="dynamic-qr-table table-fixed" style={{ minWidth: totalWidth, width: flexibleCount > 0 ? '100%' : totalWidth }}>
      <colgroup>
        {columns.map((column) => (
          <col key={column.id} style={{
            width: !flexibleIds.has(column.id)
              ? widths[column.id]
              : column.id === 'qrId' && flexibleCount > 1
                ? `${widths.qrId / totalWidth * 100}%`
                : undefined,
          }} />
        ))}
        <col style={{ width: actionsWidth }} />
      </colgroup>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={column.headerClassName}>
              {column.label}
            </TableHead>
          ))}
          <TableHead className="sticky right-0 text-right" style={{ paddingInline: 12 }}>{p.message('table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.pkey}>
            {columns.map((column) => (
              <TableCell key={column.id} className={`${column.cellClassName ?? ''} ${column.id === 'merchant' || column.id === 'terminal' || column.id === 'rrn' ? 'whitespace-normal break-words' : ''}`}>
                {column.renderCell(row)}
              </TableCell>
            ))}
            <TableCell className="sticky right-0 bg-surface text-right" style={{ paddingInline: 12 }}>
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
  const p = useDynamicQrPresentation()
  return (
    <TableScrollRegion ariaLabel={p.message('page.list')} className="rounded-2xl border border-border/70 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
      <DynamicQrTableContent rows={rows} columnOrder={columnOrder} visibleColumnIds={visibleColumnIds}
        onViewQr={onViewQr} onViewDetails={onViewDetails} />
    </TableScrollRegion>
  )
}
