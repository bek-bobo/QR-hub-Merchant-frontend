import { useDashboardPresentation } from './presentation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DynamicQrActionsMenu } from '@/features/dynamic-qr/DynamicQrActionsMenu'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import { EmptyState } from '@/shared/ui/AsyncState'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import { createDashboardRecentQrColumns } from './recent-qr-columns'

interface DashboardRecentQrTableProps {
  readonly rows: readonly DynamicQrRow[]
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onViewQr: (row: DynamicQrRow) => void
  readonly onViewDetails: (row: DynamicQrRow) => void
}

export function DashboardRecentQrTable({ rows, columnOrder, visibleColumnIds, onViewQr, onViewDetails }: DashboardRecentQrTableProps) {
  const p = useDashboardPresentation()
  const dashboardRecentQrColumns = createDashboardRecentQrColumns(p)
  const byId = new Map(dashboardRecentQrColumns.map((column) => [column.id, column] as const))
  const columns = normalizeColumnOrder({
    defaultOrder: dashboardRecentQrColumns.map((column) => column.id), savedOrder: columnOrder,
  }).filter((id) => visibleColumnIds.includes(id)).flatMap((id) => {
    const column = byId.get(id)
    return column ? [column] : []
  })

  if (rows.length === 0) return <EmptyState description={p.message('recentQr.empty')} />

  const actionsWidth = 80
  const totalWidth = columns.reduce((width, column) => width + column.width, actionsWidth)
  const flexibleColumns = columns.filter((column) => column.flexible)

  return <TableScrollRegion ariaLabel={p.message('recentQr.title')} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <Table className="dashboard-recent-qr-table table-fixed" style={{ minWidth: totalWidth, width: flexibleColumns.length > 0 ? '100%' : totalWidth }}>
      <colgroup>
        {columns.map((column) => <col key={column.id} style={{ width: column.flexible
          ? column.id === 'qrId' && flexibleColumns.length > 1 ? `${column.width / totalWidth * 100}%` : undefined
          : column.width }} />)}
        <col style={{ width: actionsWidth }} />
      </colgroup>
      <TableHeader>
        <TableRow>
          {columns.map((column) => <TableHead key={column.id} className={column.headerClassName}>{column.label}</TableHead>)}
          <TableHead className="sticky right-0 text-right">{p.message('recentQr.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => <TableRow key={row.pkey}>
          {columns.map((column) => <TableCell key={column.id} className={column.cellClassName}>{column.renderCell(row)}</TableCell>)}
          <TableCell className="sticky right-0 bg-surface text-right">
            <DynamicQrActionsMenu labels={{ viewQr: p.message('recentQr.viewQr'), viewDetails: p.message('recentQr.viewDetails') }} row={row} onViewQr={onViewQr} onViewDetails={onViewDetails} />
          </TableCell>
        </TableRow>)}
      </TableBody>
    </Table>
  </TableScrollRegion>
}
