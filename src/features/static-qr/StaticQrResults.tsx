import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page, PageSize } from '@/shared/contracts/merchant-read'
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
  readonly columnOrder: readonly string[]
  readonly visibleColumnIds: readonly string[]
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange?: (size: PageSize) => void
  readonly onViewQr?: (row: StaticQrRow) => void
  readonly onViewDetails?: (row: StaticQrRow) => void
  readonly headerActions?: ReactNode
  readonly quickFilters?: ReactNode
}

export function StaticQrResults({ terminalConfirmed, pending, error, data,
  page, columnOrder, visibleColumnIds, onRetry, onPageChange, onPageSizeChange,
  onViewQr, onViewDetails, headerActions, quickFilters }: StaticQrResultsProps) {
  return <Card className="static-qr-results min-w-0 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(4.5)] sm:[--card-spacing:--spacing(6)]" aria-busy={pending}>
    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4.5">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-xl bg-brand-soft sm:size-14">
          <img src={`${import.meta.env.BASE_URL}qrhub-favicon.svg`} alt="" className="size-8" />
        </span>
        <div className="min-w-0">
          <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">Statik QR ro‘yxati</CardTitle>
          <p className="mt-0.5 text-sm leading-5 text-text-secondary">Barcha statik QR kodlar va ularning holati bilan tanishing.</p>
        </div>
      </div>
      {!quickFilters ? headerActions : null}
    </CardHeader>
    <CardContent className="min-w-0 space-y-4.5">
      {quickFilters ? <div className="flex min-w-0 flex-wrap items-center justify-between gap-3.5">
        {quickFilters}
        {headerActions}
      </div> : null}
      {!terminalConfirmed ? <ErrorState title="Qo‘llangan filtr tasdiqlanmadi"
        description="Filtrni tozalang yoki merchant, terminal, viloyat yoki tumanni qayta tanlab qo‘llang." />
        : pending ? <LoadingState title="Statik QRlar yuklanmoqda" />
          : error ? <ErrorState onRetry={onRetry} />
            : !data ? <ErrorState title="Statik QR ro‘yxatini ko‘rsatib bo‘lmadi" />
              : data.content.length === 0 ? <EmptyState description="Statik QR topilmadi." />
                : <div className="min-w-0">
        <TableScrollRegion ariaLabel="Statik QR jadvali" className="rounded-2xl border border-border/70 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
          <StaticQrTable rows={data.content}
            columnOrder={columnOrder}
            visibleColumnIds={visibleColumnIds}
            onViewQr={onViewQr ?? (() => undefined)}
            onViewDetails={onViewDetails ?? (() => undefined)} />
        </TableScrollRegion>
      </div>}
      {data && terminalConfirmed && !pending && !error ? <PaginationBar ariaLabel="Statik QR sahifalari" currentPage={page}
        totalPages={data.totalPages} totalItems={data.totalElements}
        totalLabel={`${data.totalElements.toLocaleString('uz-UZ')} ta QR topildi`}
        className="static-qr-pagination border-0 pt-0"
        onPageChange={onPageChange} pageSize={data.size} onPageSizeChange={onPageSizeChange} /> : null}
    </CardContent>
  </Card>
}
