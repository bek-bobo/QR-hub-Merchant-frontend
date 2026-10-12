import { useCashierPresentation } from './presentation'
import { useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'
import { createUnassignTerminalController, type UnassignTarget } from './unassign-terminal'
import { useLiveUnassignTerminalAdapter } from './live-unassign-terminal'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'
import { describeCashierFeedback, type CashierFeedback } from './feedback'

interface UnassignTerminalPanelProps {
  readonly target: UnassignTarget
  readonly resultData: Page<CashierRow>
  readonly resultKey: readonly unknown[]
  readonly dataUpdatedAt: number
  readonly scope: ReadScope
  readonly getSelectedTarget: () => UnassignTarget | null
  readonly onRefresh: () => void
  readonly onCancel: () => void
  readonly onConfirmed: () => void
}

export function UnassignTerminalPanel({ target, resultData, resultKey, dataUpdatedAt, scope, getSelectedTarget, onRefresh, onCancel, onConfirmed }: UnassignTerminalPanelProps) {
  const p = useCashierPresentation()
  const runtime = useReadRuntime()
  const [message, setMessage] = useState<CashierFeedback | null>(null)
  const adapter = useLiveUnassignTerminalAdapter({ target, resultData, resultKey, dataUpdatedAt, scope, onConfirmed, getSelectedTarget })
  const [controller] = useState(() => runtime.actionRegistry.getOrCreate(
    `cashier.unassign:${scope.source}:${scope.sessionScopeId}:${scope.accessRevision}:${JSON.stringify(resultKey)}:${dataUpdatedAt}:${target.cashier.id}:${target.terminal.id}`,
    () => createUnassignTerminalController(adapter),
  ))
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const current = adapter.currentTarget()
  if (!current) return null
  if (!controller.isCurrentSelection()) return <p role="status">{p.message('unassign.stale')}</p>

  const parameters = { cashier: current.cashier.fullname, terminal: current.terminal.name, id: current.terminal.id }
  const heading = p.critical('unassign.title')
  const warning = p.critical('unassign.warning', parameters)
  const caption = p.critical('unassign.confirm')

  function confirm() {
    if (state.outcome.kind !== 'idle' || p.critical('unassign.title').status !== 'resolved'
      || p.critical('unassign.warning', parameters).status !== 'resolved'
      || p.critical('unassign.confirm').status !== 'resolved') return
    if (!controller.armConfirmation()) {
      setMessage('stale')
      return
    }
    void controller.submit().then((result) => {
      if (result.kind === 'not-sent' && adapter.currentTarget()) setMessage(describeCashierFeedback(result.reason))
    })
  }

  if (heading.status !== 'resolved' || warning.status !== 'resolved' || caption.status !== 'resolved') return <section role="alert" className="space-y-3 p-4">
    <p>{emergencyCopy.section}</p>
    <Button type="button" variant="outline" disabled={state.outcome.kind === 'pending'} onClick={onCancel}>{p.common('actions.close')}</Button>
  </section>

  return <section aria-label={p.message('unassign.label')} className="min-w-0 space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
    <h4 className="font-semibold text-text-primary">{heading.text}</h4>
    <p className="break-words text-sm text-text-secondary">{warning.text}</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="destructive" className="rounded-lg" onClick={confirm} disabled={state.outcome.kind !== 'idle'}>{caption.text}</Button>
      <Button type="button" variant="outline" className="rounded-lg" onClick={onCancel} disabled={state.outcome.kind === 'pending'}>{p.common('actions.cancel')}</Button>
    </div>
    {message ? <p role="alert" className="text-sm text-destructive">{p.feedback(message)}</p> : null}
    {state.outcome.kind === 'pending' ? <p role="status">{p.message('unassign.pending')}</p> : null}
    {state.outcome.kind === 'confirmed' ? <p role="status">{p.message('unassign.confirmed')}</p> : null}
    {state.outcome.kind === 'unknown' ? <div role="alert" className="space-y-2"><p>{p.message('unassign.unknown')}</p><Button type="button" variant="outline" onClick={onRefresh}>{p.message('actions.refreshStatus')}</Button></div> : null}
    {state.outcome.kind === 'rejected' ? <p role="alert">{p.message('feedback.rejected')}</p> : null}
    {state.outcome.kind === 'not-sent' ? <p role="alert">{p.feedback(describeCashierFeedback(state.outcome.reason))}</p> : null}
  </section>
}
