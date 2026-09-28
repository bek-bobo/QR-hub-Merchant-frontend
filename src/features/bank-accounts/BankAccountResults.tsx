import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page } from '@/shared/contracts/merchant-read'
import type { BankAccountRow } from '@/shared/contracts/management-read'

interface BankAccountResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<BankAccountRow>
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
}

export function BankAccountResults({ blocked, pending, error, data, onRetry, onPageChange }: BankAccountResultsProps) {
  if (blocked) return <ErrorState title="Qo‘llangan merchant filtri tasdiqlanmadi" description="Merchantni qayta tanlab qo‘llang yoki filtrni tozalang." />
  if (pending) return <LoadingState title="Bank hisoblari yuklanmoqda" />
  if (error) return <ErrorState onRetry={onRetry} />
  if (!data) return <ErrorState title="Bank hisoblari ro‘yxatini ko‘rsatib bo‘lmadi" />

  return <div className="min-w-0 space-y-4">
    {data.content.length === 0 ? <EmptyState description="Bank hisobi topilmadi." />
      : <Card className="min-w-0"><CardContent className="min-w-0 p-0">
        <div role="region" aria-label="Bank hisoblari jadvali" tabIndex={0} className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead><tr className="border-b"><th scope="col" className="p-3">Nomi</th><th scope="col" className="p-3">Bank</th><th scope="col" className="p-3">Hisob raqami</th><th scope="col" className="p-3">Merchant</th><th scope="col" className="p-3">MFO</th><th scope="col" className="p-3">STIR</th><th scope="col" className="p-3">Shartnoma</th><th scope="col" className="p-3">Status kodi</th></tr></thead>
            <tbody>{data.content.map((row, index) => <tr className="border-b" key={`${row.id}-${index}`}>
              <td className="p-3">{row.name}</td><td className="p-3">{row.bankName}</td><td className="break-all p-3">{row.accountNumber}</td><td className="p-3">{row.merchantName}</td><td className="p-3">{row.mfo ?? '—'}</td><td className="p-3">{row.tin ?? '—'}</td><td className="p-3">{row.contractNumber ?? '—'}</td><td className="p-3">{row.statusCode}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </CardContent></Card>}
    <nav aria-label="Bank hisoblari sahifalari" className="flex flex-wrap items-center gap-3 text-sm">
      <Button type="button" variant="outline" aria-label="Oldingi sahifa" disabled={data.page <= 0} onClick={() => onPageChange(data.page - 1)}>Oldingi</Button>
      <span aria-live="polite">{data.page + 1} / {Math.max(1, data.totalPages)}</span>
      <Button type="button" variant="outline" aria-label="Keyingi sahifa" disabled={data.page + 1 >= data.totalPages} onClick={() => onPageChange(data.page + 1)}>Keyingi</Button>
      <span>{data.totalElements} ta bank hisobi</span>
    </nav>
  </div>
}
