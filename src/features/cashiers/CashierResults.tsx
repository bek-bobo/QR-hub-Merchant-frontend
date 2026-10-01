import { useRef, type ReactNode } from 'react'
import { MonitorIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { CashierRow, CashierTerminal } from '@/shared/contracts/management-read'
import type { Page } from '@/shared/contracts/merchant-read'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import { CashierTerminalsDialog } from './CashierTerminalsDialog'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import {
  CASHIER_DEFAULT_COLUMN_ORDER,
  cashierColumns,
  type CashierColumn,
  type CashierColumnId,
} from './columns'

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
  readonly onSelect: (row: CashierRow) => void
  readonly onClose: () => void
  readonly headerActions?: ReactNode
  readonly assignSurface?: ReactNode
  readonly onUnassign?: (terminal: CashierTerminal) => void
  readonly unassignSurface?: ReactNode
}

function resolveColumns(
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
  columnOrder, visibleColumnIds, onRetry, onPageChange, onSelect, onClose,
  headerActions, assignSurface, onUnassign, unassignSurface }: CashierResultsProps) {
  const columns = resolveColumns(columnOrder, visibleColumnIds)
  const selectionTrigger = useRef<HTMLButtonElement | null>(null)

  return <div className="min-w-0 space-y-4">
    <Card className="min-w-0" aria-busy={pending}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Kassirlar ro‘yxati</CardTitle>
        {headerActions}
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        {blocked ? <ErrorState title="Qo‘llangan filtr tasdiqlanmadi" description="Merchant yoki terminalni qayta tanlab qo‘llang yoki filtrni tozalang." />
          : pending ? <LoadingState title="Kassirlar yuklanmoqda" />
            : error ? <ErrorState onRetry={onRetry} />
              : !data ? <ErrorState title="Kassirlar ro‘yxatini ko‘rsatib bo‘lmadi" />
                : data.content.length === 0 ? <EmptyState description="Kassir topilmadi." />
                  : <div className="min-w-0">
        <TableScrollRegion ariaLabel="Kassirlar jadvali">
          <Table className="min-w-[46rem]">
            <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.id}>{column.label}</TableHead>)}<TableHead className="text-right">Faol terminallar</TableHead></TableRow></TableHeader>
            <TableBody>{data.content.map((row, index) => {
              return <TableRow key={`${row.id}-${index}`}>
                {columns.map((column) => <TableCell key={column.id} className={column.cellClassName}>{column.renderCell(row)}</TableCell>)}
                <TableCell className="text-right"><Button type="button" variant="outline" size="sm"
                  className="whitespace-nowrap" aria-label={`${row.fullname} uchun biriktirilgan terminallarni ko‘rish`}
                  aria-haspopup="dialog" aria-expanded={selected?.id === row.id}
                  onClick={(event) => { selectionTrigger.current = event.currentTarget; onSelect(row) }}>
                  <MonitorIcon className="size-4" aria-hidden="true" />Terminallar · {row.terminals.length}
                </Button></TableCell>
              </TableRow>
            })}</TableBody>
          </Table>
        </TableScrollRegion>
      </div>}
        {data && !blocked && !pending && !error ? <PaginationBar ariaLabel="Kassir sahifalari" currentPage={data.page}
          totalPages={data.totalPages} totalItems={data.totalElements} showTotal={false}
          onPageChange={onPageChange} /> : null}
      </CardContent>
    </Card>
    {selected ? <CashierTerminalsDialog key={selected.id} cashier={selected} onClose={onClose}
      assignSurface={assignSurface} onUnassign={onUnassign} unassignSurface={unassignSurface}
      onCloseAutoFocus={(event) => {
        if (selectionTrigger.current?.isConnected) {
          event.preventDefault()
          selectionTrigger.current.focus()
        }
      }} /> : null}
  </div>
}
