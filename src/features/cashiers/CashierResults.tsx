import { useCashierPresentation } from './presentation'
import { useRef, type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { CashierRow, CashierTerminal } from '@/shared/contracts/management-read'
import type { Page, PageSize } from '@/shared/contracts/merchant-read'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import { CashierTerminalsDialog, type CashierTerminalsMode } from './CashierTerminalsDialog'
import { CashierActionsMenu } from './CashierActionsMenu'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import {
  CASHIER_DEFAULT_COLUMN_ORDER,
  createCashierColumns,
  type CashierColumn,
  type CashierColumnId,
} from './columns'

const columnWidths: Record<CashierColumnId, number> = {
  fullName: 220,
  phone: 190,
  role: 280,
  status: 140,
}
const actionsWidth = 80

interface CashierResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<CashierRow>
  readonly selected: CashierRow | null
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange?: (size: PageSize) => void
  readonly onSelect: (row: CashierRow) => void
  readonly onAssign?: (row: CashierRow) => void
  readonly onSelectUnassign?: (row: CashierRow) => void
  readonly terminalMode?: CashierTerminalsMode
  readonly onClose: () => void
  readonly headerActions?: ReactNode
  readonly quickFilters?: ReactNode
  readonly assignSurface?: ReactNode
  readonly onUnassign?: (terminal: CashierTerminal) => void
  readonly unassignSurface?: ReactNode
}

function resolveColumns(
  cashierColumns: ReturnType<typeof createCashierColumns>,
  order: readonly string[],
  visibleColumnIds: readonly string[],
): readonly CashierColumn[] {
  const normalized = normalizeColumnOrder({
    defaultOrder: CASHIER_DEFAULT_COLUMN_ORDER,
    savedOrder: order,
  })
  const visible = new Set(visibleColumnIds)
  const byId = new Map(cashierColumns.map((column) => [column.id, column] as const))
  return normalized.filter((id) => visible.has(id)).flatMap((id) => {
    const column = byId.get(id as CashierColumnId)
    return column ? [column] : []
  })
}

export function CashierResults({ blocked, pending, error, data, selected,
  columnOrder, visibleColumnIds, onRetry, onPageChange, onPageSizeChange, onSelect, onClose,
  headerActions, quickFilters, assignSurface, onUnassign, unassignSurface,
  onAssign, onSelectUnassign, terminalMode = 'view' }: CashierResultsProps) {
  const p = useCashierPresentation()
  const cashierColumns = createCashierColumns(p)
  const columns = resolveColumns(cashierColumns, columnOrder, visibleColumnIds)
  const selectionTrigger = useRef<HTMLButtonElement | null>(null)
  const totalWidth = columns.reduce((width, column) => width + columnWidths[column.id], actionsWidth)
  const hasFlexibleColumn = columns.some((column) => column.id === 'fullName' || column.id === 'role')

  return <div className="min-w-0 space-y-4">
    <Card className="min-w-0 gap-4 rounded-2xl border border-border/70 pt-4 shadow-sm ring-0 sm:pt-5 [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]" aria-busy={pending}>
      <CardContent className="min-w-0 space-y-4">
        {quickFilters || headerActions ? <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          {quickFilters}
          {headerActions}
        </div> : null}
        {blocked ? <ErrorState title={p.message('filters.unconfirmed')} description={p.message('filters.reselect')} />
          : pending ? <LoadingState title={p.message('states.loading')} />
            : error ? <ErrorState onRetry={onRetry} />
              : !data ? <ErrorState title={p.message('states.failed')} />
                : data.content.length === 0 ? <EmptyState description={p.message('states.empty')} />
                  : <div className="min-w-0">
        <TableScrollRegion ariaLabel={p.message('table.label')} className="rounded-xl border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Table className="cashier-table table-fixed" style={{ minWidth: totalWidth, width: hasFlexibleColumn ? '100%' : totalWidth }}>
            <colgroup>
              {columns.map((column) => <col key={column.id} style={{ width: column.id === 'fullName' || column.id === 'role' ? undefined : columnWidths[column.id] }} />)}
              <col style={{ width: actionsWidth }} />
            </colgroup>
            <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.id}>{column.label}</TableHead>)}<TableHead className="w-16 text-right">{p.message('table.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>{data.content.map((row, index) => {
              return <TableRow key={`${row.id}-${index}`}>
                {columns.map((column) => <TableCell key={column.id} className={column.cellClassName}>{column.renderCell(row)}</TableCell>)}
                <TableCell className="text-right"><CashierActionsMenu row={row}
                  onViewTerminals={(target, trigger) => { selectionTrigger.current = trigger; onSelect(target) }}
                  onAssign={onAssign ? (target, trigger) => { selectionTrigger.current = trigger; onAssign(target) } : undefined}
                  onUnassign={onSelectUnassign ? (target, trigger) => { selectionTrigger.current = trigger; onSelectUnassign(target) } : undefined} />
                </TableCell>
              </TableRow>
            })}</TableBody>
          </Table>
        </TableScrollRegion>
      </div>}
        {data && !blocked && !pending && !error ? <PaginationBar ariaLabel={p.message('table.pages')} currentPage={data.page}
          totalPages={data.totalPages} totalItems={data.totalElements}
          totalLabel={p.message('table.total', { countText: p.number(data.totalElements) })}
          className="cashier-pagination border-t-0 pt-0"
          onPageChange={onPageChange} pageSize={data.size} onPageSizeChange={onPageSizeChange} /> : null}
      </CardContent>
    </Card>
    {selected ? <CashierTerminalsDialog key={`${selected.id}:${terminalMode}`} cashier={selected} mode={terminalMode} onClose={onClose}
      assignSurface={assignSurface} onUnassign={onUnassign} unassignSurface={unassignSurface}
      onCloseAutoFocus={(event) => {
        if (selectionTrigger.current?.isConnected) {
          event.preventDefault()
          selectionTrigger.current.focus()
        }
      }} /> : null}
  </div>
}
