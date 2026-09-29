import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { isSafeApiError } from '@/shared/api/errors'
import type { Page } from '@/shared/contracts/merchant-read'
import type { P5Row } from '@/shared/contracts/p5-read'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { presentP5Status } from './page-state'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'

interface P5ResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: unknown
  readonly data?: Page<P5Row>
  readonly selected: P5Row | null
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly onSelect: (row: P5Row) => void
  readonly resetAvailable?: boolean
  readonly resetUnavailableMessage?: string | undefined
  readonly onReset?: (row: P5Row) => void
}

export function P5Results({ blocked, pending, error, data, selected, onRetry, onPageChange, onSelect, resetAvailable = false, resetUnavailableMessage, onReset }: P5ResultsProps) {
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

  return <div className="min-w-0 space-y-4">
    {data.content.length === 0 ? <EmptyState description="P5 qurilmasi topilmadi." />
      : <Card className="min-w-0"><CardContent className="min-w-0 p-0">
        <TableScrollRegion ariaLabel="P5 qurilmalari jadvali">
          <Table className="min-w-[70rem]">
            <TableHeader><TableRow><TableHead className="text-right">Tanlash</TableHead><TableHead>Qurilma ID</TableHead><TableHead>Tavsif</TableHead><TableHead>Terminal</TableHead><TableHead>Merchant</TableHead><TableHead>Qurilma holati</TableHead><TableHead className="text-right"><span className="inline-flex items-center justify-end gap-1">PIN reset{resetUnavailableMessage ? <span className="group relative inline-flex"><button type="button" className="inline-flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="PIN reset haqida ma’lumot" aria-describedby="p5-reset-info"><InfoIcon className="size-4" aria-hidden="true" /></button><span id="p5-reset-info" role="tooltip" className="invisible absolute right-0 top-full z-20 mt-1 w-64 rounded-md border bg-popover px-3 py-2 text-left text-xs font-normal text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">{resetUnavailableMessage}</span></span> : null}</span></TableHead><TableHead>Yaratilgan vaqt</TableHead></TableRow></TableHeader>
            <TableBody>{data.content.map((row, index) => {
              const ambiguous = deviceOccurrences.get(row.deviceId) !== 1
              const status = presentP5Status(row.deviceStatus)
              const isSelected = selected === row
              return <TableRow data-state={isSelected ? 'selected' : undefined} key={`${row.deviceId}-${index}`}>
                <TableCell className="text-right"><Button type="button" size="sm" variant="outline" disabled={ambiguous} aria-pressed={isSelected} aria-label={`${row.deviceId} qurilmasini tanlash`} onClick={() => onSelect(row)}>{isSelected ? 'Tanlangan' : 'Tanlash'}</Button></TableCell>
                <TableCell><MetadataId value={row.deviceId} /></TableCell>
                <TableCell className="max-w-72 whitespace-normal break-words">{row.description ?? '—'}</TableCell>
                <TableCell className="max-w-64 whitespace-normal break-words"><span className="font-medium text-foreground">{row.terminalName}</span><MetadataId value={row.terminalId} variant="secondary" /></TableCell>
                <TableCell className="max-w-56 whitespace-normal break-words">{row.merchantName}</TableCell>
                <TableCell><Badge variant="outline" className={statusToneClasses[status.tone].badge}>{status.label}</Badge></TableCell>
                <TableCell className="text-right"><Button type="button" size="sm" variant="outline" disabled={!resetAvailable || ambiguous || row.deviceStatus !== 0} onClick={() => onReset?.(row)}>PIN reset</Button></TableCell>
                <TableCell>{formatOffsetlessDateTime(row.createdAt)}</TableCell>
              </TableRow>
            })}</TableBody>
          </Table>
        </TableScrollRegion>
      </CardContent></Card>}
    <PaginationBar ariaLabel="P5 qurilmalari sahifalari" currentPage={data.page}
      totalPages={data.totalPages} totalItems={data.totalElements} showTotal={false}
      onPageChange={onPageChange} />
  </div>
}
import { InfoIcon } from 'lucide-react'
