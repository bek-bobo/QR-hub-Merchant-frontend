import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page } from '@/shared/contracts/merchant-read'
import type { StaticQrRow } from './contract'
import { StaticQrTable } from './StaticQrTable'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'

interface StaticQrResultsProps {
  readonly terminalConfirmed: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<StaticQrRow>
  readonly page: number
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
}

export function StaticQrResults({ terminalConfirmed, pending, error, data,
  page, onRetry, onPageChange }: StaticQrResultsProps) {
  if (!terminalConfirmed) return <ErrorState title="Tanlangan terminal endi tasdiqlanmadi"
    description="Filtrni tozalang yoki terminalni qayta tanlab qo‘llang." />
  if (pending) return <LoadingState title="Statik QRlar yuklanmoqda" />
  if (error) return <ErrorState onRetry={onRetry} />
  if (!data) return <ErrorState title="Statik QR ro‘yxatini ko‘rsatib bo‘lmadi" />

  return <div className="min-w-0 space-y-4">
    {data.content.length === 0 ? <EmptyState description="Statik QR topilmadi." />
      : <Card className="min-w-0"><CardContent className="min-w-0 p-0">
        <TableScrollRegion ariaLabel="Statik QR jadvali">
          <StaticQrTable rows={data.content} />
        </TableScrollRegion>
      </CardContent></Card>}
    <PaginationBar ariaLabel="Statik QR sahifalari" currentPage={page}
      totalPages={data.totalPages} totalItems={data.totalElements}
      onPageChange={onPageChange} />
  </div>
}
