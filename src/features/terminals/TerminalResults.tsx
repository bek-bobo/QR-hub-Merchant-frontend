import type { ReactNode } from 'react'
import { MonitorIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page, PageSize } from '@/shared/contracts/merchant-read'
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

const columnWidths: Record<TerminalColumnId, number> = {
  terminalId: 320,
  merchant: 200,
  name: 220,
  bankAccount: 200,
  status: 120,
}
const flexibleColumnIds = new Set<TerminalColumnId>(['merchant', 'name', 'bankAccount'])
const actionsWidth = 80

interface TerminalResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<TerminalRow>
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange?: (size: PageSize) => void
  readonly headerActions?: ReactNode
  readonly quickFilters?: ReactNode
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
  visibleColumnIds, onRetry, onPageChange, onPageSizeChange, headerActions, quickFilters, onViewQr, onViewDetails }: TerminalResultsProps) {
  const columns = resolveColumns(columnOrder, visibleColumnIds)
  const totalWidth = columns.reduce((width, column) => width + columnWidths[column.id], actionsWidth)
  const hasFlexibleColumn = columns.some((column) => flexibleColumnIds.has(column.id))

  return <Card className="min-w-0 gap-5 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]" aria-busy={pending}>
    <CardHeader className="flex flex-col gap-4">
      <div className="flex min-w-0 items-center gap-5">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <MonitorIcon className="size-7" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">Terminallar</CardTitle>
          <p className="text-sm text-text-secondary">Terminallar ro‘yxati</p>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3">
        {quickFilters}
        {headerActions}
      </div>
    </CardHeader>
    <CardContent className="min-w-0 space-y-4">
      {blocked ? <ErrorState title="Qo‘llangan filtr tasdiqlanmadi" description="Merchant, bank hisobi, viloyat yoki tumanni qayta tanlab qo‘llang yoki filtrni tozalang." />
        : pending ? <LoadingState title="Terminallar yuklanmoqda" />
          : error ? <ErrorState onRetry={onRetry} />
            : !data ? <ErrorState title="Terminal ro‘yxatini ko‘rsatib bo‘lmadi" />
              : data.content.length === 0 ? <EmptyState description="Terminal topilmadi." />
                : <div className="min-w-0">
        <TableScrollRegion ariaLabel="Terminal jadvali" className="rounded-xl border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Table className="terminal-table table-fixed" style={{ minWidth: totalWidth, width: hasFlexibleColumn ? '100%' : totalWidth }}>
            <colgroup>
              {columns.map((column) => <col key={column.id} style={{ width: flexibleColumnIds.has(column.id) ? undefined : columnWidths[column.id] }} />)}
              <col style={{ width: actionsWidth }} />
            </colgroup>
            <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.id}>{column.label}</TableHead>)}
              <TableHead className="sticky right-0 text-right">Amallar</TableHead>
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
        totalPages={data.totalPages} totalItems={data.totalElements}
        totalLabel={`Jami ${data.totalElements.toLocaleString('uz-UZ')} ta Terminal`}
        className="terminal-pagination border-t-0 pt-1"
        onPageChange={onPageChange} pageSize={data.size} onPageSizeChange={onPageSizeChange} /> : null}
    </CardContent>
  </Card>
}
