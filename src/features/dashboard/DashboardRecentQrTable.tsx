import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DynamicQrActionsMenu } from '@/features/dynamic-qr/DynamicQrActionsMenu'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import { EmptyState } from '@/shared/ui/AsyncState'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import { dashboardRecentQrColumns } from './recent-qr-columns'

interface DashboardRecentQrTableProps {
  readonly rows: readonly DynamicQrRow[]
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onViewQr: (row: DynamicQrRow) => void
  readonly onViewDetails: (row: DynamicQrRow) => void
}

export function DashboardRecentQrTable({ rows, columnOrder, visibleColumnIds, onViewQr, onViewDetails }: DashboardRecentQrTableProps) {
  const byId = new Map(dashboardRecentQrColumns.map((column) => [column.id, column] as const))
  const columns = normalizeColumnOrder({
    defaultOrder: dashboardRecentQrColumns.map((column) => column.id), savedOrder: columnOrder,
  }).filter((id) => visibleColumnIds.includes(id)).flatMap((id) => {
    const column = byId.get(id)
    return column ? [column] : []
  })

  if (rows.length === 0) return <EmptyState description="Tanlangan davrda dinamik QR topilmadi." />

  return <TableScrollRegion ariaLabel="So‘nggi dinamik QRlar">
    <Table className="min-w-[46rem]">
      <TableHeader>
        <TableRow>
          {columns.map((column) => <TableHead key={column.id} className={column.headerClassName}>{column.label}</TableHead>)}
          <TableHead className="sticky right-0 w-16 bg-surface text-right">Amallar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => <TableRow key={row.pkey}>
          {columns.map((column) => <TableCell key={column.id} className={column.cellClassName}>{column.renderCell(row)}</TableCell>)}
          <TableCell className="sticky right-0 bg-surface text-right">
            <DynamicQrActionsMenu row={row} onViewQr={onViewQr} onViewDetails={onViewDetails} />
          </TableCell>
        </TableRow>)}
      </TableBody>
    </Table>
  </TableScrollRegion>
}
