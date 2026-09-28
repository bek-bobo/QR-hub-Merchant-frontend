import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { can } from '@/shared/auth/access'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { createHttpTransport, validateWebBaseUrl } from '@/shared/api/http'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { PageHeader } from '@/shared/ui/PageHeader'
import { applyStaticTerminal, changeStaticPageSize, clearStaticTerminal,
  defaultStaticFilters, getStaticTerminalState, type StaticQrFilters } from './page-state'
import { createStaticQrQueryOptions } from './query'
import { StaticQrResults } from './StaticQrResults'

export function StaticQrPage() {
  const runtime = useReadRuntime()
  const access = useAccessContext()
  const { bridge, getSessionSnapshot } = useProtectedReadContext()
  const [draftTerminal, setDraftTerminal] = useState('')
  const [applied, setApplied] = useState<StaticQrFilters>(defaultStaticFilters)
  const base = validateWebBaseUrl(import.meta.env.VITE_WEB_API_BASE_URL,
    import.meta.env.DEV ? 'development' : 'production')
  const baseUrl = base.kind === 'valid' ? base.value : null
  const transport = useMemo(() => baseUrl
    ? createHttpTransport({ service: 'web', baseUrl }) : null,
    [baseUrl])
  const lookupOptions = runtime.queries.terminalOptions()
  const terminals = useQuery(lookupOptions)
  const lookup = { enabled: lookupOptions.enabled, pending: terminals.isPending,
    error: terminals.isError, terminals: terminals.data }
  const lookupUsable = lookup.enabled && !lookup.pending && !lookup.error && Boolean(lookup.terminals)
  const selectedValid = getStaticTerminalState(applied, lookup) === 'valid'
  const staticReadAllowed = can(access, 'staticQr.read', false)
  const list = useQuery(createStaticQrQueryOptions({
    scope: runtime.scope, currentScope: runtime.getCurrentScope, filters: applied,
    staticReadAllowed, authReady: runtime.readiness.auth.kind === 'configured',
    terminalConfirmed: selectedValid, transport, bridge, getSessionSnapshot,
  }))

  if (!staticReadAllowed) return <NoAccessState description="Statik QR ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.auth.kind === 'unavailable') return <ErrorState title="Statik QR autentifikatsiyasi sozlanmagan" />
  if (!transport) return <ErrorState title="Statik QR integratsiyasi sozlanmagan" />

  return <div className="mx-auto min-w-0 max-w-7xl space-y-5">
    <PageHeader
      title="Statik QRlar"
      description={
        <>
          Biriktirilgan terminallar bo‘yicha ro‘yxat.
          <span className="block">QR ko‘rinishi kontrakt tasdiqlangach mavjud bo‘ladi.</span>
        </>
      }
    />
    <Card className="min-w-0"><CardHeader><CardTitle>Filterlar</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="min-w-0 space-y-1 text-sm">Terminal
        <Select className="sm:w-auto" value={draftTerminal}
          disabled={!lookupUsable}
          onChange={(event) => setDraftTerminal(event.target.value)}>
          <option value="">Barcha terminallar</option>
          {terminals.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
      </label>
      {!lookupUsable ? <p role="status" className="text-sm text-text-secondary">
        {applied.terminalId
          ? 'Terminal filtri hozir mavjud emas; qo‘llangan filtr tasdiqlanmaguncha ro‘yxat to‘xtatiladi.'
          : 'Terminal filtri hozir mavjud emas; ro‘yxat filtrsiz ishlaydi.'}
      </p> : null}
      <Button type="button" disabled={Boolean(draftTerminal) &&
        getStaticTerminalState({ ...applied, terminalId: draftTerminal }, lookup) !== 'valid'}
        onClick={() => { const next = applyStaticTerminal(applied, draftTerminal, lookup); if (next) setApplied(next) }}>Qo‘llash</Button>
      <Button type="button" variant="outline" onClick={() => {
        setDraftTerminal(''); setApplied((current) => clearStaticTerminal(current))
      }}>Tozalash</Button>
      <label className="min-w-0 space-y-1 text-sm">Sahifa hajmi
        <Select className="sm:w-auto" value={applied.size}
          onChange={(event) => { const nextSize = event.target.value; setApplied((current) => changeStaticPageSize(current, nextSize)) }}>
          <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
        </Select>
      </label>
    </CardContent></Card>
    <StaticQrResults terminalConfirmed={selectedValid} pending={list.isPending}
      error={list.isError} data={list.data} page={applied.page}
      onRetry={() => void list.refetch()}
      onPageChange={(page) => setApplied((current) => ({ ...current, page }))} />
  </div>
}
