import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page } from '@/shared/contracts/merchant-read'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import { TerminalActionsMenu } from './TerminalActionsMenu'
import {
  TERMINAL_DEFAULT_COLUMN_ORDER,
  terminalColumns,
  type TerminalColumn,
  type TerminalColumnId,
} from './columns'

interface TerminalResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<TerminalRow>
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly headerActions?: ReactNode
  readonly onViewQr: (row: TerminalRow) => void
  readonly onViewDetails: (row: TerminalRow) => void
}

function resolveColumns(
  order: readonly string[],
  visibleColumnIds: readonly string[],
): readonly TerminalColumn[] {
  const normalized = normalizeColumnOrder({
    defaultOrder: TERMINAL_DEFAULT_COLUMN_ORDER,
    savedOrder: order,
  })
  const visible = new Set(visibleColumnIds)
  const byId = new Map(terminalColumns.map((column) => [column.id, column] as const))
  return normalized.filter((id) => visible.has(id)).flatMap((id) => {
    const column = byId.get(id as TerminalColumnId)
    return column ? [column] : []
  })
}

export function TerminalResults({ blocked, pending, error, data, columnOrder,
  visibleColumnIds, onRetry, onPageChange, headerActions, onViewQr, onViewDetails }: TerminalResultsProps) {
  const columns = resolveColumns(columnOrder, visibleColumnIds)

  return <Card className="min-w-0" aria-busy={pending}>
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle>Terminallar ro‘yxati</CardTitle>
      {headerActions}
    </CardHeader>
    <CardContent className="min-w-0 space-y-4">
      {blocked ? <ErrorState title="Qo‘llangan filtr tasdiqlanmadi" description="Merchant yoki bank hisobini qayta tanlab qo‘llang yoki filtrni tozalang." />
        : pending ? <LoadingState title="Terminallar yuklanmoqda" />
          : error ? <ErrorState onRetry={onRetry} />
            : !data ? <ErrorState title="Terminal ro‘yxatini ko‘rsatib bo‘lmadi" />
              : data.content.length === 0 ? <EmptyState description="Terminal topilmadi." />
                : <div className="min-w-0">
        <TableScrollRegion ariaLabel="Terminal jadvali">
          <Table className="min-w-[40rem]">
            <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.id}>{column.label}</TableHead>)}
              <TableHead className="sticky right-0 w-16 bg-surface text-right">Amallar</TableHead>
            </TableRow></TableHeader>
            <TableBody>{data.content.map((row, index) => <TableRow key={`${row.id}-${index}`}>
              {columns.map((column) => <TableCell key={column.id} className={column.cellClassName}>{column.renderCell(row)}</TableCell>)}
              <TableCell className="sticky right-0 bg-surface text-right">
                <TerminalActionsMenu row={row} onViewQr={onViewQr} onViewDetails={onViewDetails} />
              </TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableScrollRegion>
      </div>}
      {data && !blocked && !pending && !error ? <PaginationBar ariaLabel="Terminal sahifalari" currentPage={data.page}
        totalPages={data.totalPages} totalItems={data.totalElements} showTotal={false}
        onPageChange={onPageChange} /> : null}
    </CardContent>
  </Card>
}
