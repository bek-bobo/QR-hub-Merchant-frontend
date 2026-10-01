import { useState } from 'react'
import { P5ActionsMenu } from './P5ActionsMenu'
import { P5QrDialog } from './P5QrDialog'
import { P5DetailsSheet } from './P5DetailsSheet'
import { Button } from '@/components/ui/button'
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

interface P5ResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: unknown
  readonly data?: Page<P5Row>
  readonly selected: P5Row | null
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly onSelect: (row: P5Row) => void
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

export function P5Results({ blocked, pending, error, data, selected, columnOrder,
  visibleColumnIds, onRetry, onPageChange, onSelect, resetAvailable = false,
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
  const createdAtIndex = columns.findIndex((column) => column.id === 'createdAt')
  const columnsBeforeReset = createdAtIndex < 0 ? columns : columns.slice(0, createdAtIndex)
  const columnsAfterReset = createdAtIndex < 0 ? [] : columns.slice(createdAtIndex)

  return <div className="min-w-0 space-y-4">
    {data.content.length === 0 ? <EmptyState description="P5 qurilmasi topilmadi." />
      : <Card className="min-w-0"><CardContent className="min-w-0 p-0">
        <TableScrollRegion ariaLabel="P5 qurilmalari jadvali">
          <Table className="min-w-[70rem]">
            <TableHeader><TableRow><TableHead className="text-right">Tanlash</TableHead>{columnsBeforeReset.map((column) => <TableHead key={column.id}>{column.label}</TableHead>)}<TableHead className="text-right"><span className="inline-flex items-center justify-end gap-1">PIN reset{resetUnavailableMessage ? <span className="group relative inline-flex"><button type="button" className="inline-flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="PIN reset haqida ma’lumot" aria-describedby="p5-reset-info"><InfoIcon className="size-4" aria-hidden="true" /></button><span id="p5-reset-info" role="tooltip" className="invisible absolute right-0 top-full z-20 mt-1 w-64 rounded-md border bg-popover px-3 py-2 text-left text-xs font-normal text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">{resetUnavailableMessage}</span></span> : null}</span></TableHead>{columnsAfterReset.map((column) => <TableHead key={column.id}>{column.label}</TableHead>)}<TableHead className="w-16 text-right">Amallar</TableHead></TableRow></TableHeader>
            <TableBody>{data.content.map((row, index) => {
              const ambiguous = deviceOccurrences.get(row.deviceId) !== 1
              const isSelected = selected === row
              return <TableRow data-state={isSelected ? 'selected' : undefined} key={`${row.deviceId}-${index}`}>
                <TableCell className="text-right"><Button type="button" size="sm" variant="outline" disabled={ambiguous} aria-pressed={isSelected} aria-label={`${row.deviceId} qurilmasini tanlash`} onClick={() => onSelect(row)}>{isSelected ? 'Tanlangan' : 'Tanlash'}</Button></TableCell>
                {columnsBeforeReset.map((column) => <TableCell key={column.id} className={column.cellClassName}>{column.renderCell(row)}</TableCell>)}
                <TableCell className="text-right"><Button type="button" size="sm" variant="outline" disabled={!resetAvailable || ambiguous || row.deviceStatus !== 0} onClick={() => onReset?.(row)}>PIN reset</Button></TableCell>
                {columnsAfterReset.map((column) => <TableCell key={column.id} className={column.cellClassName}>{column.renderCell(row)}</TableCell>)}
                <TableCell className="w-16 text-right"><P5ActionsMenu row={row}
                  onViewQr={(loadedRow) => setAction({ kind: 'qr', row: loadedRow })}
                  onViewDetails={(loadedRow) => setAction({ kind: 'details', row: loadedRow })} /></TableCell>
              </TableRow>
            })}</TableBody>
          </Table>
        </TableScrollRegion>
      </CardContent></Card>}
    <PaginationBar ariaLabel="P5 qurilmalari sahifalari" currentPage={data.page}
      totalPages={data.totalPages} totalItems={data.totalElements} showTotal={false}
      onPageChange={onPageChange} />
    <P5QrDialog row={action?.kind === 'qr' ? actionRow : null} onOpenChange={(open) => { if (!open) setAction(null) }} />
    <P5DetailsSheet row={action?.kind === 'details' ? actionRow : null} onOpenChange={(open) => { if (!open) setAction(null) }}
      onViewQr={(loadedRow) => setAction({ kind: 'qr', row: loadedRow })} />
  </div>
}
import { InfoIcon } from 'lucide-react'
