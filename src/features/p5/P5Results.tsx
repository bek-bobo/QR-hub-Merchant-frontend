import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { isSafeApiError } from '@/shared/api/errors'
import type { Page } from '@/shared/contracts/merchant-read'
import type { P5Row } from '@/shared/contracts/p5-read'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { presentP5Status } from './page-state'
import { PaginationBar } from '@/shared/ui/PaginationBar'

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
  readonly onReset?: (row: P5Row) => void
}

export function P5Results({ blocked, pending, error, data, selected, onRetry, onPageChange, onSelect, resetAvailable = false, onReset }: P5ResultsProps) {
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
        <div role="region" aria-label="P5 qurilmalari jadvali" tabIndex={0} className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[70rem] text-left text-sm">
            <thead><tr className="border-b"><th scope="col" className="p-3">Tanlash</th><th scope="col" className="p-3">Qurilma ID</th><th scope="col" className="p-3">Tavsif</th><th scope="col" className="p-3">Terminal</th><th scope="col" className="p-3">Merchant</th><th scope="col" className="p-3">Qurilma holati</th><th scope="col" className="p-3">PIN reset</th><th scope="col" className="p-3">Yaratilgan vaqt</th></tr></thead>
            <tbody>{data.content.map((row, index) => {
              const ambiguous = deviceOccurrences.get(row.deviceId) !== 1
              const status = presentP5Status(row.deviceStatus)
              const isSelected = selected === row
              return <tr className="border-b" data-state={isSelected ? 'selected' : undefined} key={`${row.deviceId}-${index}`}>
                <td className="p-3"><Button type="button" size="sm" variant="outline" disabled={ambiguous} aria-pressed={isSelected} aria-label={`${row.deviceId} qurilmasini tanlash`} onClick={() => onSelect(row)}>{isSelected ? 'Tanlangan' : 'Tanlash'}</Button></td>
                <td className="max-w-52 break-all p-3 font-medium">{row.deviceId}</td>
                <td className="max-w-72 whitespace-normal break-words p-3">{row.description ?? '—'}</td>
                <td className="max-w-64 whitespace-normal break-words p-3"><span className="font-medium">{row.terminalName}</span><span className="block break-all text-xs text-text-secondary">{row.terminalId}</span></td>
                <td className="max-w-56 whitespace-normal break-words p-3">{row.merchantName}</td>
                <td className="p-3"><Badge variant="outline" className={statusToneClasses[status.tone].badge}>{status.label}</Badge></td>
                <td className="p-3"><Button type="button" size="sm" variant="outline" disabled={!resetAvailable || ambiguous || row.deviceStatus !== 0} onClick={() => onReset?.(row)}>PIN reset</Button></td>
                <td className="whitespace-nowrap p-3">{formatOffsetlessDateTime(row.createdAt)}</td>
              </tr>
            })}</tbody>
          </table>
        </div>
      </CardContent></Card>}
    <PaginationBar ariaLabel="P5 qurilmalari sahifalari" currentPage={data.page}
      totalPages={data.totalPages} totalItems={data.totalElements}
      onPageChange={onPageChange} />
  </div>
}
