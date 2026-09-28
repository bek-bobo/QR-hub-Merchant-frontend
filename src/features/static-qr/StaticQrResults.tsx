import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page } from '@/shared/contracts/merchant-read'
import type { StaticQrRow } from './contract'
import { StaticQrTable } from './StaticQrTable'

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
        <div role="region" aria-label="Statik QR jadvali" tabIndex={0}
          className="max-w-full overflow-x-auto">
          <StaticQrTable rows={data.content} />
        </div>
      </CardContent></Card>}
    <nav aria-label="Statik QR sahifalari" className="flex flex-wrap items-center gap-3 text-sm">
      <Button type="button" variant="outline" aria-label="Oldingi sahifa"
        disabled={page <= 0} onClick={() => onPageChange(page - 1)}>Oldingi</Button>
      <span aria-live="polite">{data.page + 1} / {Math.max(1, data.totalPages)}</span>
      <Button type="button" variant="outline" aria-label="Keyingi sahifa"
        disabled={data.page + 1 >= data.totalPages}
        onClick={() => onPageChange(page + 1)}>Keyingi</Button>
    </nav>
  </div>
}
