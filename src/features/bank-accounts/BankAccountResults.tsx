import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page } from '@/shared/contracts/merchant-read'
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

interface BankAccountResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<BankAccountRow>
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly headerActions?: ReactNode
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
  visibleColumnIds, onRetry, onPageChange, headerActions }: BankAccountResultsProps) {
  const columns = resolveColumns(columnOrder, visibleColumnIds)

  return <Card className="min-w-0" aria-busy={pending}>
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle>Bank hisoblari ro‘yxati</CardTitle>
      {headerActions}
    </CardHeader>
    <CardContent className="min-w-0 space-y-4">
      {blocked ? <ErrorState title="Qo‘llangan merchant filtri tasdiqlanmadi" description="Merchantni qayta tanlab qo‘llang yoki filtrni tozalang." />
        : pending ? <LoadingState title="Bank hisoblari yuklanmoqda" />
          : error ? <ErrorState onRetry={onRetry} />
            : !data ? <ErrorState title="Bank hisoblari ro‘yxatini ko‘rsatib bo‘lmadi" />
              : data.content.length === 0 ? <EmptyState description="Bank hisobi topilmadi." />
                : <div className="min-w-0">
        <TableScrollRegion ariaLabel="Bank hisoblari jadvali">
          <Table className="min-w-[64rem]">
            <TableHeader><TableRow>{columns.map((column) => <TableHead key={column.id}>{column.label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{data.content.map((row, index) => <TableRow key={`${row.id}-${index}`}>
              {columns.map((column) => <TableCell key={column.id} className={column.cellClassName}>{column.renderCell(row)}</TableCell>)}
            </TableRow>)}</TableBody>
          </Table>
        </TableScrollRegion>
      </div>}
      {data && !blocked && !pending && !error ? <PaginationBar ariaLabel="Bank hisoblari sahifalari" currentPage={data.page}
        totalPages={data.totalPages} totalItems={data.totalElements} showTotal={false}
        onPageChange={onPageChange} /> : null}
    </CardContent>
  </Card>
}
