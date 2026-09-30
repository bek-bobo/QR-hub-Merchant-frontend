import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { CashierRow, CashierTerminal } from '@/shared/contracts/management-read'
import type { Page } from '@/shared/contracts/merchant-read'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import { presentCashierTerminalStatus } from './status-presentation'
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
                <TableCell className="text-right"><Button type="button" variant="outline" size="sm" aria-label={`${row.fullname}: Biriktirishlarni ko‘rish`} aria-expanded={selected?.id === row.id} onClick={() => onSelect(row)}>Biriktirishlarni ko‘rish</Button></TableCell>
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
    {selected ? <Card className="min-w-0"><CardContent className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{selected.fullname} — faol terminal biriktirishlari</h3><Button type="button" variant="outline" size="sm" onClick={onClose}>Yopish</Button></div>
      <section aria-label="Faol terminal biriktirishlari">
        {selected.terminals.length === 0 ? <p className="text-sm text-text-secondary">Terminal biriktirilmagan.</p>
          : <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">{selected.terminals.map((terminal, index) => {
            const status = presentCashierTerminalStatus(terminal.statusCode)
            return <li key={`${terminal.id}-${index}`} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border p-2"><span className="font-medium text-foreground">{terminal.name}</span><MetadataId value={terminal.id} variant="secondary" className="max-w-64" /><Badge variant="outline" className={statusToneClasses[status.tone].badge}>{status.label}</Badge>{onUnassign ? <Button type="button" variant="outline" size="sm" aria-label={`${terminal.name} (${terminal.id}) terminalini ajratish`} onClick={() => onUnassign(terminal)}>Ajratish</Button> : null}</li>
          })}</ul>}
      </section>
      {unassignSurface}
      {assignSurface}
    </CardContent></Card> : null}
  </div>
}
