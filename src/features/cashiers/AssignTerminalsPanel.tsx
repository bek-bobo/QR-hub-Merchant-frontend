import { describeCashierFeedback, type CashierFeedback } from './feedback'
import { useCashierPresentation } from './presentation'
import { useState, useSyncExternalStore, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CircleHelpIcon, MonitorIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'
import { buildAssignTerminalsRequest, createAssignTerminalsController } from './assign-terminals'
import { useLiveAssignTerminalsAdapter } from './live-assign-terminals'

interface AssignTerminalsPanelProps {
  readonly target: CashierRow
  readonly resultData: Page<CashierRow>
  readonly resultKey: readonly unknown[]
  readonly dataUpdatedAt: number
  readonly scope: ReadScope
  readonly onRefresh: () => void
  readonly onConfirmed: () => void
}

export function AssignTerminalsPanel({ target, resultData, resultKey, dataUpdatedAt, scope, onRefresh, onConfirmed }: AssignTerminalsPanelProps) {
  const p = useCashierPresentation()
  const runtime = useReadRuntime()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [message, setMessage] = useState<CashierFeedback | null>(null)
  const lookupOptions = runtime.queries.terminalLookupOptions()
  const lookup = useQuery(lookupOptions)
  const adapter = useLiveAssignTerminalsAdapter({ target, resultData, resultKey, dataUpdatedAt, scope, onConfirmed })
  const [controller] = useState(() => runtime.actionRegistry.getOrCreate(
    `cashier.assign:${scope.source}:${scope.sessionScopeId}:${scope.accessRevision}:${JSON.stringify(resultKey)}:${dataUpdatedAt}:${target.id}`,
    () => createAssignTerminalsController(adapter),
  ))
  // The scoped registry owns this intent; panel teardown only detaches the UI subscription.
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const row = adapter.currentTarget()
  if (!row) return null
  const active = new Set(row.terminals.map((terminal) => terminal.id))
  const available = lookup.data?.filter((option) => !active.has(option.id)) ?? []
  const validRequest = buildAssignTerminalsRequest(row, selectedIds, adapter.currentOptions())
  const lookupReason = !runtime.capabilities.terminalLookup ? 'lookup.assignDenied'
    : !lookupOptions.enabled ? 'lookup.unavailable'
      : lookup.isError ? 'lookup.failed'
        : lookup.isPending ? 'lookup.loading'
          : !adapter.currentOptions() ? 'lookup.unconfirmed' : null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void controller.submit(selectedIds).then((result) => {
      if (result.kind === 'not-sent' && adapter.currentTarget()) setMessage(describeCashierFeedback(result.reason))
    })
  }

  return <section aria-label={p.message('assign.title')} className="space-y-3">
    <h4 className="text-base font-semibold text-text-primary">{p.message('assign.title')}</h4>
    <p className="text-sm text-text-secondary">{p.message('assign.warning')}</p>
    <form className="space-y-3" onSubmit={submit}>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium text-text-primary">{p.message('assign.options')}</legend>
        {available.map((option) => <label key={option.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/40 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 has-checked:border-brand/40 has-checked:bg-brand-soft/30">
          <input type="checkbox" className="size-4 shrink-0 accent-brand" checked={selectedIds.includes(option.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, option.id] : ids.filter((id) => id !== option.id))} />
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><MonitorIcon className="size-4" /></span>
          <span className="min-w-0 break-words">{option.name}</span>
        </label>)}
      </fieldset>
      {lookupReason ? <p role="status" className="text-sm text-text-secondary">{p.message(lookupReason)}</p> : null}
      {!validRequest && !lookupReason ? <p role="status" className="flex items-start gap-2 text-sm text-text-secondary"><CircleHelpIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{p.message('assign.selectionHelp')}</p> : null}
      {message ? <p role="alert" className="text-sm text-destructive">{p.feedback(message)}</p> : null}
      <Button type="submit" className="min-h-10 rounded-lg px-5" disabled={!validRequest || Boolean(lookupReason) || state.outcome.kind !== 'idle'}>{p.message('assign.submit')}</Button>
    </form>
    {state.outcome.kind === 'pending' ? <p role="status">{p.message('assign.pending')}</p> : null}
    {state.outcome.kind === 'confirmed' ? <p role="status">{p.message('assign.confirmed')}</p> : null}
    {state.outcome.kind === 'unknown' ? <div role="alert" className="space-y-2"><p>{p.message('assign.unknown')}</p><Button type="button" variant="outline" onClick={onRefresh}>{p.message('actions.refreshStatus')}</Button></div> : null}
    {state.outcome.kind === 'rejected' ? <p role="alert">{p.message('feedback.rejected')}</p> : null}
    {state.outcome.kind === 'not-sent' ? <p role="alert">{p.feedback(describeCashierFeedback(state.outcome.reason))}</p> : null}
  </section>
}
