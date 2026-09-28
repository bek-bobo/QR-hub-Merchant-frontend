import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page } from '@/shared/contracts/merchant-read'
import type { TerminalRow } from '@/shared/contracts/management-read'

interface TerminalResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<TerminalRow>
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
}

export function TerminalResults({ blocked, pending, error, data, onRetry, onPageChange }: TerminalResultsProps) {
  if (blocked) return <ErrorState title="Qo‘llangan filtr tasdiqlanmadi" description="Merchant yoki bank hisobini qayta tanlab qo‘llang yoki filtrni tozalang." />
  if (pending) return <LoadingState title="Terminallar yuklanmoqda" />
  if (error) return <ErrorState onRetry={onRetry} />
  if (!data) return <ErrorState title="Terminal ro‘yxatini ko‘rsatib bo‘lmadi" />

  return <div className="min-w-0 space-y-4">
    {data.content.length === 0 ? <EmptyState description="Terminal topilmadi." />
      : <Card className="min-w-0"><CardContent className="min-w-0 p-0">
        <div role="region" aria-label="Terminal jadvali" tabIndex={0} className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead><tr className="border-b"><th scope="col" className="p-3">Terminal ID</th><th scope="col" className="p-3">Nomi</th><th scope="col" className="p-3">Merchant</th><th scope="col" className="p-3">Bank hisobi</th><th scope="col" className="p-3">Status kodi</th></tr></thead>
            <tbody>{data.content.map((row, index) => <tr className="border-b" key={`${row.id}-${index}`}>
              <td className="break-all p-3">{row.id}</td><td className="p-3">{row.name}</td><td className="p-3">{row.merchantName}</td><td className="p-3">{row.bankAccountName}</td><td className="p-3">{row.statusCode}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </CardContent></Card>}
    <nav aria-label="Terminal sahifalari" className="flex flex-wrap items-center gap-3 text-sm">
      <Button type="button" variant="outline" aria-label="Oldingi sahifa" disabled={data.page <= 0} onClick={() => onPageChange(data.page - 1)}>Oldingi</Button>
      <span aria-live="polite">{data.page + 1} / {Math.max(1, data.totalPages)}</span>
      <Button type="button" variant="outline" aria-label="Keyingi sahifa" disabled={data.page + 1 >= data.totalPages} onClick={() => onPageChange(data.page + 1)}>Keyingi</Button>
      <span>{data.totalElements} ta terminal</span>
    </nav>
  </div>
}
