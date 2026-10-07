import { useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'
import { createUnassignTerminalController, type UnassignTarget } from './unassign-terminal'
import { useLiveUnassignTerminalAdapter } from './live-unassign-terminal'

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
  const runtime = useReadRuntime()
  const [message, setMessage] = useState<string | null>(null)
  const adapter = useLiveUnassignTerminalAdapter({ target, resultData, resultKey, dataUpdatedAt, scope, onConfirmed, getSelectedTarget })
  const [controller] = useState(() => runtime.actionRegistry.getOrCreate(
    `cashier.unassign:${scope.source}:${scope.sessionScopeId}:${scope.accessRevision}:${JSON.stringify(resultKey)}:${dataUpdatedAt}:${target.cashier.id}:${target.terminal.id}`,
    () => createUnassignTerminalController(adapter),
  ))
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const current = adapter.currentTarget()
  if (!current) return null
  if (!controller.isCurrentSelection()) return <p role="status">Oldingi tanlov endi amal qilmaydi. Kassirlar ro‘yxatini yangilang.</p>

  function confirm() {
    if (!controller.armConfirmation()) {
      setMessage('Kassir yoki faol terminal tanlovi eskirgan. Ro‘yxatni yangilang.')
      return
    }
    void controller.submit().then((result) => {
      if (result.kind === 'not-sent' && adapter.currentTarget()) setMessage(result.reason)
    })
  }

  return <section aria-label="Terminalni ajratishni tasdiqlash" className="min-w-0 space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
    <h4 className="font-semibold text-text-primary">Terminalni kassirdan ajratish</h4>
    <p className="break-words text-sm text-text-secondary">{current.cashier.fullname} kassirdan <span className="font-medium text-text-primary">{current.terminal.name}</span> (<span className="break-all">{current.terminal.id}</span>) terminalining biriktirilishini olib tashlashni tasdiqlaysizmi?</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="destructive" className="rounded-lg" onClick={confirm} disabled={state.outcome.kind !== 'idle'}>Terminalni ajratish</Button>
      <Button type="button" variant="outline" className="rounded-lg" onClick={onCancel} disabled={state.outcome.kind === 'pending'}>Bekor qilish</Button>
    </div>
    {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
    {state.outcome.kind === 'pending' ? <p role="status">Ajratish so‘rovi yuborilmoqda.</p> : null}
    {state.outcome.kind === 'confirmed' ? <p role="status">Terminalni ajratish so‘rovi tasdiqlandi. Joriy faol biriktirishlar yangilangach tekshiriladi.</p> : null}
    {state.outcome.kind === 'unknown' ? <div role="alert" className="space-y-2"><p>Natija noma’lum. Terminal allaqachon ajratilgan bo‘lishi mumkin. Qayta urinishdan oldin kassirning terminal holatini yangilang.</p><Button type="button" variant="outline" onClick={onRefresh}>Holatni yangilash</Button></div> : null}
    {state.outcome.kind === 'rejected' ? <p role="alert">{state.outcome.reason}</p> : null}
    {state.outcome.kind === 'not-sent' ? <p role="alert">{state.outcome.reason}</p> : null}
  </section>
}
