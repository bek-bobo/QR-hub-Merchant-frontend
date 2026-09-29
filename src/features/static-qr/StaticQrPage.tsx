import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { can } from '@/shared/auth/access'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { createHttpTransport, validateWebBaseUrl } from '@/shared/api/http'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RefreshCwIcon } from 'lucide-react'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { applyStaticTerminal, clearStaticTerminal,
  defaultStaticFilters, getStaticTerminalState, type StaticQrFilters } from './page-state'
import { createStaticQrQueryOptions } from './query'
import { StaticQrResults } from './StaticQrResults'

interface StaticQrFiltersProps {
  readonly draftTerminal: string
  readonly applied: StaticQrFilters
  readonly terminals: readonly { readonly id: string; readonly name: string }[] | undefined
  readonly lookupUsable: boolean
  readonly onDraftTerminalChange: (terminalId: string) => void
}

export function StaticQrFilters({
  draftTerminal,
  applied,
  terminals,
  lookupUsable,
  onDraftTerminalChange,
}: StaticQrFiltersProps) {
  return <>
    <label className="block min-w-0 space-y-1 text-sm">Terminal
      <Select value={draftTerminal}
        disabled={!lookupUsable}
        onChange={(event) => onDraftTerminalChange(event.target.value)}>
        <option value="">Barcha terminallar</option>
        {terminals?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
    </label>
    {!lookupUsable ? <p role="status" className="text-sm text-text-secondary">
      {applied.terminalId
        ? 'Terminal filtri hozir mavjud emas; qo‘llangan filtr tasdiqlanmaguncha ro‘yxat to‘xtatiladi.'
        : 'Terminal filtri hozir mavjud emas; ro‘yxat filtrsiz ishlaydi.'}
    </p> : null}
  </>
}

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

  function applyFilters(): boolean {
    const next = applyStaticTerminal(applied, draftTerminal, lookup)
    if (!next) return false
    setApplied(next)
    return true
  }

  function resetFilters() {
    setDraftTerminal('')
    setApplied((current) => clearStaticTerminal(current))
  }

  if (!staticReadAllowed) return <NoAccessState description="Statik QR ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.auth.kind === 'unavailable') return <ErrorState title="Statik QR autentifikatsiyasi sozlanmagan" />
  if (!transport) return <ErrorState title="Statik QR integratsiyasi sozlanmagan" />

  return <div className="mx-auto min-w-0 max-w-7xl">
    <StaticQrResults terminalConfirmed={selectedValid} pending={list.isPending}
      error={list.isError} data={list.data} page={applied.page}
      onRetry={() => void list.refetch()}
      onPageChange={(page) => setApplied((current) => ({ ...current, page }))}
      headerActions={<div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <FilterDrawer
          onApply={applyFilters}
          onReset={resetFilters}
          applyDisabled={Boolean(draftTerminal) &&
            getStaticTerminalState({ ...applied, terminalId: draftTerminal }, lookup) !== 'valid'}
          triggerSize="sm"
        >
          <StaticQrFilters
            draftTerminal={draftTerminal}
            applied={applied}
            terminals={terminals.data}
            lookupUsable={lookupUsable}
            onDraftTerminalChange={setDraftTerminal}
          />
        </FilterDrawer>
        <Button type="button" variant="outline" size="sm"
          disabled={!selectedValid || list.isFetching} onClick={() => void list.refetch()}>
          <RefreshCwIcon aria-hidden="true" className={list.isFetching ? 'animate-spin' : ''} />
          Yangilash
        </Button>
      </div>} />
  </div>
}
