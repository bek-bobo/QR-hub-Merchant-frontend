import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page, PageSize } from '@/shared/contracts/merchant-read'
import type { BankAccountRow } from '@/shared/contracts/management-read'
import { normalizeColumnOrder } from '@/shared/table-columns/order'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import {
  BANK_ACCOUNT_DEFAULT_COLUMN_ORDER,
  bankAccountColumns,
  type BankAccountColumn,
  type BankAccountColumnId,
} from './columns'

const columnWidths: Record<BankAccountColumnId, number> = {
  name: 150,
  bank: 180,
  accountNumber: 210,
  merchant: 180,
  mfo: 72,
  stir: 100,
  contract: 106,
  status: 120,
}
const flexibleColumnIds = new Set<BankAccountColumnId>(['name', 'bank', 'merchant'])

interface BankAccountResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<BankAccountRow>
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange?: (size: PageSize) => void
  readonly headerActions?: ReactNode
  readonly quickFilters?: ReactNode
}

function resolveColumns(
  order: readonly string[],
  visibleColumnIds: readonly string[],
): readonly BankAccountColumn[] {
  const normalized = normalizeColumnOrder({
    defaultOrder: BANK_ACCOUNT_DEFAULT_COLUMN_ORDER,
    savedOrder: order,
  })
  const visible = new Set(visibleColumnIds)
  const byId = new Map(bankAccountColumns.map((column) => [column.id, column] as const))
  return normalized.filter((id) => visible.has(id)).flatMap((id) => {
    const column = byId.get(id as BankAccountColumnId)
    return column ? [column] : []
  })
}

export function BankAccountResults({ blocked, pending, error, data, columnOrder,
  visibleColumnIds, onRetry, onPageChange, onPageSizeChange, headerActions, quickFilters }: BankAccountResultsProps) {
  const columns = resolveColumns(columnOrder, visibleColumnIds)
  const totalWidth = columns.reduce((width, column) => width + columnWidths[column.id], 0)
  const hasFlexibleColumn = columns.some((column) => flexibleColumnIds.has(column.id))

  return <Card className="min-w-0 gap-5 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]" aria-busy={pending}>
    <CardHeader className="flex flex-col gap-4">
      <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">Bank hisoblari ro‘yxati</CardTitle>
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3">
        {quickFilters}
        {headerActions}
      </div>
    </CardHeader>
    <CardContent className="min-w-0 space-y-4">
      {blocked ? <ErrorState title="Qo‘llangan merchant filtri tasdiqlanmadi" description="Merchantni qayta tanlab qo‘llang yoki filtrni tozalang." />
        : pending ? <LoadingState title="Bank hisoblari yuklanmoqda" />
          : error ? <ErrorState onRetry={onRetry} />
            : !data ? <ErrorState title="Bank hisoblari ro‘yxatini ko‘rsatib bo‘lmadi" />
              : data.content.length === 0 ? <EmptyState description="Bank hisobi topilmadi." />
                : <div className="min-w-0">
        <TableScrollRegion ariaLabel="Bank hisoblari jadvali" className="rounded-xl border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Table className="bank-account-table table-fixed" style={{ minWidth: totalWidth, width: hasFlexibleColumn ? '100%' : totalWidth }}>
            <colgroup>
              {columns.map((column) => <col key={column.id} style={{ width: flexibleColumnIds.has(column.id) ? undefined : columnWidths[column.id] }} />)}
            </colgroup>
            <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.id}>{column.label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{data.content.map((row, index) => <TableRow key={`${row.id}-${index}`}>
              {columns.map((column) => <TableCell key={column.id} className={column.cellClassName}>{column.renderCell(row)}</TableCell>)}
            </TableRow>)}</TableBody>
          </Table>
        </TableScrollRegion>
      </div>}
      {data && !blocked && !pending && !error ? <PaginationBar ariaLabel="Bank hisoblari sahifalari" currentPage={data.page}
        totalPages={data.totalPages} totalItems={data.totalElements}
        totalLabel={`Jami ${data.totalElements.toLocaleString('uz-UZ')} ta Bank hisoblari`}
        className="bank-account-pagination border-t-0 pt-2"
        onPageChange={onPageChange} pageSize={data.size} onPageSizeChange={onPageSizeChange} /> : null}
    </CardContent>
  </Card>
}
