import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  readonly onViewQr?: (row: StaticQrRow) => void
  readonly onViewDetails?: (row: StaticQrRow) => void
  readonly headerActions?: ReactNode
}

export function StaticQrResults({ terminalConfirmed, pending, error, data,
  page, onRetry, onPageChange, onViewQr, onViewDetails, headerActions }: StaticQrResultsProps) {
  return <Card className="min-w-0" aria-busy={pending}>
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle>Statik QR ro‘yxati</CardTitle>
      {headerActions}
    </CardHeader>
    <CardContent className="min-w-0 space-y-4">
      {!terminalConfirmed ? <ErrorState title="Tanlangan terminal endi tasdiqlanmadi"
        description="Filtrni tozalang yoki terminalni qayta tanlab qo‘llang." />
        : pending ? <LoadingState title="Statik QRlar yuklanmoqda" />
          : error ? <ErrorState onRetry={onRetry} />
            : !data ? <ErrorState title="Statik QR ro‘yxatini ko‘rsatib bo‘lmadi" />
              : data.content.length === 0 ? <EmptyState description="Statik QR topilmadi." />
                : <div className="min-w-0">
        <TableScrollRegion ariaLabel="Statik QR jadvali">
          <StaticQrTable rows={data.content}
            onViewQr={onViewQr ?? (() => undefined)}
            onViewDetails={onViewDetails ?? (() => undefined)} />
        </TableScrollRegion>
      </div>}
      {data && terminalConfirmed && !pending && !error ? <PaginationBar ariaLabel="Statik QR sahifalari" currentPage={page}
        totalPages={data.totalPages} totalItems={data.totalElements} showTotal={false}
        onPageChange={onPageChange} /> : null}
    </CardContent>
  </Card>
}
