import { useStaticQrPresentation } from './presentation'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  const p = useStaticQrPresentation()
  return <Card className="static-qr-results min-w-0 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(4.5)] sm:[--card-spacing:--spacing(6)]" aria-busy={pending}>
    <CardContent className="min-w-0 space-y-4.5">
      {quickFilters || headerActions ? <div className="flex min-w-0 flex-wrap items-center justify-between gap-3.5">
        {quickFilters}
        {headerActions}
      </div> : null}
      {!terminalConfirmed ? <ErrorState title={p.message('filters.unconfirmed')}
        description={p.message('filters.reselect')} />
        : pending ? <LoadingState title={p.message('states.loading')} />
          : error ? <ErrorState onRetry={onRetry} />
            : !data ? <ErrorState title={p.message('states.failed')} />
              : data.content.length === 0 ? <EmptyState description={p.message('states.empty')} />
                : <div className="min-w-0">
        <TableScrollRegion ariaLabel={p.message('table.label')} className="rounded-2xl border border-border/70 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
          <StaticQrTable rows={data.content}
            columnOrder={columnOrder}
            visibleColumnIds={visibleColumnIds}
            onViewQr={onViewQr ?? (() => undefined)}
            onViewDetails={onViewDetails ?? (() => undefined)} />
        </TableScrollRegion>
      </div>}
      {data && terminalConfirmed && !pending && !error ? <PaginationBar ariaLabel={p.message('table.pages')} currentPage={page}
        totalPages={data.totalPages} totalItems={data.totalElements}
        totalLabel={p.message('table.total', { countText: p.number(data.totalElements) })}
        className="static-qr-pagination border-0 pt-0"
        onPageChange={onPageChange} pageSize={data.size} onPageSizeChange={onPageSizeChange} /> : null}
    </CardContent>
  </Card>
}
