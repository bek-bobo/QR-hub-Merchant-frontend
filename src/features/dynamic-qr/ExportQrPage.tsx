import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createDefaultDynamicQrFilters, getTerminalFilterState, parseQrStatusInput } from './page-state'
import { applyExportDraft } from './export-page-state'
import type { DynamicQrFilterDraft } from './filters'
import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ExportButton } from './ExportButton'

export function ExportQrPage() {
  const runtime = useReadRuntime()
  const [initial] = useState(() => createDefaultDynamicQrFilters())
  const [draft, setDraft] = useState<DynamicQrFilterDraft>(initial)
  const [applied, setApplied] = useState<DynamicQrFilters>(initial)
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const terminalOptions = runtime.queries.terminalOptions()
  const terminals = useQuery(terminalOptions)
  const lookup = {
    lookupEnabled: terminalOptions.enabled,
    lookupPending: terminals.isPending,
    lookupError: terminals.isError,
    terminals: terminals.data,
  }
  const appliedTerminalState = getTerminalFilterState(applied, lookup)
  const terminalSelectorAvailable = terminalOptions.enabled && !terminals.isPending &&
    !terminals.isError && Boolean(terminals.data)

  function apply() {
    const result = applyExportDraft(draft, lookup)
    if (result.kind !== 'applied') {
      setMessage(result.kind === 'invalid-date'
        ? 'Sana oralig‘ini to‘g‘ri kiriting.'
        : 'Tanlangan terminalni tasdiqlab bo‘lmadi. Terminal filtrini tozalang.')
      return
    }
    setDraft(result.filters)
    setApplied(result.filters)
    setRevision((current) => current + 1)
    setMessage(null)
  }

  function clear() {
    setDraft(initial)
    setApplied(initial)
    setRevision((current) => current + 1)
    setMessage(null)
  }

  return <div className="mx-auto max-w-2xl space-y-4">
    <PageHeader title="Dinamik QR XLSX eksporti" />
    <Card><CardHeader><CardTitle>Filtrlar</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-text-secondary">O‘zgarishlar faqat “Qo‘llash” bosilganda eksport filtriga qo‘shiladi.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">Boshlanish sanasi<Input type="date" value={draft.fromDate}
          aria-invalid={message === 'Sana oralig‘ini to‘g‘ri kiriting.'}
          onChange={(event) => setDraft({ ...draft, fromDate: event.target.value })} /></label>
        <label className="space-y-1 text-sm">Tugash sanasi<Input type="date" value={draft.toDate}
          aria-invalid={message === 'Sana oralig‘ini to‘g‘ri kiriting.'}
          onChange={(event) => setDraft({ ...draft, toDate: event.target.value })} /></label>
      </div>
      <label className="block space-y-1 text-sm">Terminal
        <Select
          value={draft.terminalId ?? ''} disabled={!terminalSelectorAvailable}
          onChange={(event) => setDraft({ ...draft, terminalId: event.target.value || undefined })}>
          <option value="">Barcha terminallar</option>
          {terminals.data?.map((terminal) => <option key={terminal.id} value={terminal.id}>{terminal.name}</option>)}
        </Select>
      </label>
      {!terminalSelectorAvailable ? <p className="text-sm text-text-secondary">
        {terminalOptions.enabled && terminals.isPending
          ? 'Terminal ro‘yxati tekshirilmoqda.'
          : 'Terminal filtri mavjud emas. Terminal tanlanmagan eksport davom etishi mumkin.'}
      </p> : null}
      {appliedTerminalState !== 'valid' ? <p role="alert" className="text-sm text-destructive">
        Qo‘llangan terminal endi tasdiqlanmayapti. Eksportni davom ettirish uchun filtrni aniq tozalang.
      </p> : null}
      <label className="block space-y-1 text-sm">Terminal nomi bo‘yicha qidiruv
        <Input type="search" value={draft.search} placeholder="Terminal nomi bo‘yicha"
          onChange={(event) => setDraft({ ...draft, search: event.target.value })} />
      </label>
      <label className="block space-y-1 text-sm">Status
        <Select
          value={draft.status === undefined ? '' : String(draft.status)}
          onChange={(event) => setDraft({ ...draft, status: parseQrStatusInput(event.target.value) })}>
          <option value="">Barchasi</option><option value="0">Yangi</option>
          <option value="10">Jarayonda</option><option value="50">Muvaffaqiyatli</option>
          <option value="5">Muddati o‘tgan</option><option value="20">Bekor qilingan</option>
        </Select>
      </label>
      {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={apply}>Qo‘llash</Button>
        <Button type="button" variant="outline" onClick={clear}>Tozalash</Button>
        <ExportButton applied={applied} terminalValid={appliedTerminalState === 'valid'} intentRevision={revision} />
      </div>
      <p className="text-xs text-text-secondary">Eksport qo‘llangan filtrlarga tegishli; sahifadagi qatorlar bilan cheklanmaydi.</p>
    </CardContent></Card>
  </div>
}
