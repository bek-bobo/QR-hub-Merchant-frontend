import { useState } from 'react'
import { P5ActionsMenu } from './P5ActionsMenu'
import { P5QrDialog } from './P5QrDialog'
import { P5DetailsSheet } from './P5DetailsSheet'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { isSafeApiError } from '@/shared/api/errors'
import type { Page } from '@/shared/contracts/merchant-read'
import type { P5Row } from '@/shared/contracts/p5-read'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import {
  P5_DEFAULT_COLUMN_ORDER,
  p5Columns,
  type P5Column,
  type P5ColumnId,
} from './columns'

const columnWidths: Record<P5ColumnId, number> = {
  deviceId: 128,
  description: 128,
  terminal: 224,
  merchant: 176,
  status: 128,
  createdAt: 156,
}
const flexibleColumnIds = new Set<P5ColumnId>(['description', 'terminal', 'merchant'])
const actionsWidth = 76

interface P5ResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: unknown
  readonly data?: Page<P5Row>
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly resetAvailable?: boolean
  readonly resetUnavailableMessage?: string | undefined
  readonly onReset?: (row: P5Row) => void
}

function resolveColumns(
  order: readonly string[],
  visibleColumnIds: readonly string[],
): readonly P5Column[] {
  const normalized = normalizeColumnOrder({
    defaultOrder: P5_DEFAULT_COLUMN_ORDER,
    savedOrder: order,
  })
  const visible = new Set(visibleColumnIds)
  const byId = new Map(p5Columns.map((column) => [column.id, column] as const))
  return normalized.filter((id) => visible.has(id)).flatMap((id) => {
    const column = byId.get(id as P5ColumnId)
    return column ? [column] : []
  })
}

export function P5Results({ blocked, pending, error, data, columnOrder,
  visibleColumnIds, onRetry, onPageChange, resetAvailable = false,
  resetUnavailableMessage, onReset }: P5ResultsProps) {
  const [action, setAction] = useState<{ readonly kind: 'qr' | 'details'; readonly row: P5Row } | null>(null)
  const actionRow = action && data?.content.includes(action.row) ? action.row : null
  if (blocked) return <ErrorState title="Qo‘llangan P5 filtri tasdiqlanmadi" description="Filtrni tozalang yoki merchant va terminalni qayta tanlab qo‘llang." />
  if (pending) return <LoadingState title="P5 qurilmalari yuklanmoqda" />
  if (error) {
    return isSafeApiError(error) && error.kind === 'contract'
      ? <ErrorState title="P5 javobi kutilgan formatga mos emas" description="Ma’lumot bo‘sh ro‘yxat sifatida ko‘rsatilmadi. Qayta urinib ko‘ring." onRetry={onRetry} />
      : <ErrorState onRetry={onRetry} />
  }
  if (!data) return <ErrorState title="P5 qurilmalari ro‘yxatini ko‘rsatib bo‘lmadi" />

  const deviceOccurrences = new Map<string, number>()
  for (const row of data.content) deviceOccurrences.set(row.deviceId, (deviceOccurrences.get(row.deviceId) ?? 0) + 1)
  const columns = resolveColumns(columnOrder, visibleColumnIds)
  const totalWidth = columns.reduce((width, column) => width + columnWidths[column.id], actionsWidth)
  const flexibleColumns = columns.filter((column) => flexibleColumnIds.has(column.id))
  const renderColumnWidth = (column: P5Column) => (
    <col key={column.id} style={{ width: flexibleColumnIds.has(column.id)
      ? column.id === 'terminal' && flexibleColumns.length > 1
        ? `${columnWidths.terminal / totalWidth * 100}%`
        : undefined
      : columnWidths[column.id] }} />
  )

  return <Card className="min-w-0 rounded-2xl border border-border/70 shadow-sm ring-0"><CardContent className="min-w-0 space-y-6">
    {data.content.length === 0 ? <EmptyState description="P5 qurilmasi topilmadi." />
      : <TableScrollRegion ariaLabel="P5 qurilmalari jadvali" className="rounded-xl border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Table className="p5-table table-fixed" style={{ minWidth: totalWidth, width: flexibleColumns.length > 0 ? '100%' : totalWidth }}>
            <colgroup>
              {columns.map(renderColumnWidth)}
              <col style={{ width: actionsWidth }} />
            </colgroup>
            <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.id}>{column.label}</TableHead>)}<TableHead className="w-16 text-right">Amallar</TableHead></TableRow></TableHeader>
            <TableBody>{data.content.map((row, index) => {
              const ambiguous = deviceOccurrences.get(row.deviceId) !== 1
              return <TableRow key={`${row.deviceId}-${index}`}>
                {columns.map((column) => <TableCell key={column.id} className={column.cellClassName}>{column.renderCell(row)}</TableCell>)}
                <TableCell className="w-16 text-right"><P5ActionsMenu row={row}
                  resetDisabled={!resetAvailable || ambiguous || row.deviceStatus !== 0}
                  resetUnavailableMessage={resetUnavailableMessage} onReset={onReset}
                  onViewQr={(loadedRow) => setAction({ kind: 'qr', row: loadedRow })}
                  onViewDetails={(loadedRow) => setAction({ kind: 'details', row: loadedRow })} /></TableCell>
              </TableRow>
            })}</TableBody>
          </Table>
        </TableScrollRegion>}
    <PaginationBar ariaLabel="P5 qurilmalari sahifalari" currentPage={data.page}
      totalPages={data.totalPages} totalItems={data.totalElements}
      totalLabel={`Jami ${data.totalElements.toLocaleString('uz-UZ')} ta yozuv`}
      className="p5-pagination border-t-0 pt-1"
      onPageChange={onPageChange} />
    <P5QrDialog row={action?.kind === 'qr' ? actionRow : null} onOpenChange={(open) => { if (!open) setAction(null) }} />
    <P5DetailsSheet row={action?.kind === 'details' ? actionRow : null} onOpenChange={(open) => { if (!open) setAction(null) }}
      onViewQr={(loadedRow) => setAction({ kind: 'qr', row: loadedRow })} />
  </CardContent></Card>
}
