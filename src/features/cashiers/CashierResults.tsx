import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { CashierRow, CashierTerminal } from '@/shared/contracts/management-read'
import type { Page } from '@/shared/contracts/merchant-read'

interface CashierResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<CashierRow>
  readonly selected: CashierRow | null
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly onSelect: (row: CashierRow) => void
  readonly onClose: () => void
  readonly assignSurface?: ReactNode
  readonly onUnassign?: (terminal: CashierTerminal) => void
  readonly unassignSurface?: ReactNode
}

export function CashierResults({ blocked, pending, error, data, selected, onRetry, onPageChange, onSelect, onClose, assignSurface, onUnassign, unassignSurface }: CashierResultsProps) {
  if (blocked) return <ErrorState title="Qo‘llangan filtr tasdiqlanmadi" description="Merchant yoki terminalni qayta tanlab qo‘llang yoki filtrni tozalang." />
  if (pending) return <LoadingState title="Kassirlar yuklanmoqda" />
  if (error) return <ErrorState onRetry={onRetry} />
  if (!data) return <ErrorState title="Kassirlar ro‘yxatini ko‘rsatib bo‘lmadi" />

  return <div className="min-w-0 space-y-4">
    {data.content.length === 0 ? <EmptyState description="Kassir topilmadi." />
      : <Card className="min-w-0"><CardContent className="min-w-0 p-0">
        <div role="region" aria-label="Kassirlar jadvali" tabIndex={0} className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead><tr className="border-b"><th scope="col" className="p-3">F.I.Sh.</th><th scope="col" className="p-3">Telefon</th><th scope="col" className="p-3">Rol</th><th scope="col" className="p-3">Status kodi</th><th scope="col" className="p-3">Faol terminallar</th></tr></thead>
            <tbody>{data.content.map((row, index) => <tr className="border-b" key={`${row.id}-${index}`}>
              <td className="p-3">{row.fullname}</td><td className="p-3">{row.phone}</td><td className="p-3">{row.roleDisplay ?? '—'}</td><td className="p-3">{row.statusCode}</td>
              <td className="p-3"><Button type="button" variant="outline" size="sm" aria-label={`${row.fullname}: Biriktirishlarni ko‘rish`} aria-expanded={selected?.id === row.id} onClick={() => onSelect(row)}>Biriktirishlarni ko‘rish</Button></td>
            </tr>)}</tbody>
          </table>
        </div>
      </CardContent></Card>}
    {selected ? <Card className="min-w-0"><CardContent className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{selected.fullname} — faol terminal biriktirishlari</h3><Button type="button" variant="outline" size="sm" onClick={onClose}>Yopish</Button></div>
      <section aria-label="Faol terminal biriktirishlari">
        {selected.terminals.length === 0 ? <p className="text-sm text-text-secondary">Terminal biriktirilmagan.</p>
          : <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">{selected.terminals.map((terminal, index) => <li key={`${terminal.id}-${index}`} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border p-2"><span>{terminal.name}</span> <span className="break-all text-text-secondary">({terminal.id})</span> <span className="text-text-secondary">Status kodi: {terminal.statusCode}</span>{onUnassign ? <Button type="button" variant="outline" size="sm" aria-label={`${terminal.name} (${terminal.id}) terminalini ajratish`} onClick={() => onUnassign(terminal)}>Ajratish</Button> : null}</li>)}</ul>}
      </section>
      {unassignSurface}
      {assignSurface}
    </CardContent></Card> : null}
    <nav aria-label="Kassir sahifalari" className="flex flex-wrap items-center gap-3 text-sm">
      <Button type="button" variant="outline" aria-label="Oldingi sahifa" disabled={data.page <= 0} onClick={() => onPageChange(data.page - 1)}>Oldingi</Button>
      <span aria-live="polite">{data.page + 1} / {Math.max(1, data.totalPages)}</span>
      <Button type="button" variant="outline" aria-label="Keyingi sahifa" disabled={data.page + 1 >= data.totalPages} onClick={() => onPageChange(data.page + 1)}>Keyingi</Button>
      <span>{data.totalElements} ta kassir</span>
    </nav>
  </div>
}
