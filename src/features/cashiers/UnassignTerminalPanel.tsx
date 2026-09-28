import { useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { ActionNotDispatchedError } from '@/shared/api/one-dispatch-action'
import { safeHttpError } from '@/shared/api/errors'
import { createHttpTransport, validateWebBaseUrl } from '@/shared/api/http'
import { endpoints } from '@/shared/contracts/endpoints'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'
import { invalidateCurrentCashierLists } from './create-cashier'
import { createUnassignTerminalController, resolveCurrentUnassignTarget, type UnassignPort, type UnassignTarget } from './unassign-terminal'

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId && left.accessRevision === right.accessRevision
}

interface UnassignTerminalPanelProps {
  readonly target: UnassignTarget
  readonly resultData: Page<CashierRow>
  readonly resultKey: readonly unknown[]
  readonly dataUpdatedAt: number
  readonly scope: ReadScope
  readonly isSelected: () => boolean
  readonly onRefresh: () => void
  readonly onCancel: () => void
  readonly onConfirmed: () => void
}

export function UnassignTerminalPanel({ target, resultData, resultKey, dataUpdatedAt, scope, isSelected, onRefresh, onCancel, onConfirmed }: UnassignTerminalPanelProps) {
  const runtime = useReadRuntime()
  const { getCurrentScope } = runtime
  const queryClient = useQueryClient()
  const { getSessionSnapshot, protectedMutation } = useProtectedReadContext()
  const [message, setMessage] = useState<string | null>(null)
  const base = validateWebBaseUrl(import.meta.env.VITE_WEB_API_BASE_URL, import.meta.env.DEV ? 'development' : 'production')
  const [transport] = useState(() => base.kind === 'valid' ? createHttpTransport({ service: 'web', baseUrl: base.value }) : null)

  const currentTarget = (): UnassignTarget | null => {
    const session = getSessionSnapshot()
    const state = queryClient.getQueryState<Page<CashierRow>>(resultKey)
    return isSelected() ? resolveCurrentUnassignTarget({
      target, resultData, currentData: state?.status === 'success' ? state.data : undefined,
      dataUpdatedAt, currentUpdatedAt: state?.dataUpdatedAt, invalidated: state?.isInvalidated ?? true,
      scope, currentScope: getCurrentScope(),
      canRead: session.phase === 'authenticated' && session.profile.permissions.includes('GET_CASHIERS'),
      canUnassign: session.phase === 'authenticated' && session.profile.permissions.includes('UNASSIGN_TERMINAL'),
    }) : null
  }
  const [port] = useState<UnassignPort | null>(() => transport ? {
    async unassign(query, intentScope) {
      let dispatched = false
      const result = await protectedMutation(async ({ accessToken, signal }) => {
        const current = currentTarget()
        if (!current || !sameScope(intentScope, getCurrentScope()) ||
          current.cashier.id !== query.cashierId || current.terminal.id !== query.terminalId || signal.aborted) {
          throw new ActionNotDispatchedError()
        }
        dispatched = true
        const response = await transport.request({ endpoint: endpoints.unassignCashierTerminal,
          credential: { kind: 'bearer', accessToken }, query, signal })
        if (!response.ok) throw safeHttpError(response.status)
        if (response.status !== 200) throw new Error('Unassign response was not confirmed.')
        return response.body
      })
      if (result.status === 'success') return result.data
      if (!dispatched) throw new ActionNotDispatchedError()
      throw new Error('Dispatched unassign outcome is unknown.')
    },
  } : null)
  const [controller] = useState(() => runtime.actionRegistry.getOrCreate(
    `cashier.unassign:${scope.source}:${scope.sessionScopeId}:${scope.accessRevision}:${JSON.stringify(resultKey)}:${dataUpdatedAt}:${target.cashier.id}:${target.terminal.id}`,
    () => createUnassignTerminalController({
      currentScope: getCurrentScope,
      currentTarget,
      canUnassign: () => {
        const session = getSessionSnapshot()
        return session.phase === 'authenticated' && session.profile.permissions.includes('UNASSIGN_TERMINAL')
      },
      port: () => port,
      invalidateConfirmed: async (intentScope) => {
        if (!sameScope(intentScope, getCurrentScope())) return
        onConfirmed()
        await invalidateCurrentCashierLists(queryClient, intentScope, true)
      },
    }),
  ))
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const current = currentTarget()
  if (!current) return null
  if (!controller.isCurrentSelection()) return <p role="status">Oldingi tanlov endi amal qilmaydi. Kassirlar ro‘yxatini yangilang.</p>

  function confirm() {
    if (!controller.armConfirmation()) {
      setMessage('Kassir yoki faol terminal tanlovi eskirgan. Ro‘yxatni yangilang.')
      return
    }
    void controller.submit().then((result) => {
      if (result.kind === 'not-sent' && currentTarget()) setMessage(result.reason)
    })
  }

  return <section aria-label="Terminalni ajratishni tasdiqlash" className="min-w-0 space-y-3 rounded-lg border p-3">
    <h4 className="font-medium">Terminalni kassirdan ajratish</h4>
    <p className="break-words text-sm">{current.cashier.fullname} kassirdan <span className="font-medium">{current.terminal.name}</span> (<span className="break-all">{current.terminal.id}</span>) terminalining biriktirilishini olib tashlashni tasdiqlaysizmi?</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="destructive" onClick={confirm} disabled={state.outcome.kind !== 'idle'}>Terminalni ajratish</Button>
      <Button type="button" variant="outline" onClick={onCancel} disabled={state.outcome.kind === 'pending'}>Bekor qilish</Button>
    </div>
    {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
    {state.outcome.kind === 'pending' ? <p role="status">Ajratish so‘rovi yuborilmoqda.</p> : null}
    {state.outcome.kind === 'confirmed' ? <p role="status">Terminalni ajratish so‘rovi tasdiqlandi. Joriy faol biriktirishlar yangilangach tekshiriladi.</p> : null}
    {state.outcome.kind === 'unknown' ? <div role="alert" className="space-y-2"><p>Natija noma’lum. Terminal allaqachon ajratilgan bo‘lishi mumkin. Qayta urinishdan oldin kassirning terminal holatini yangilang.</p><Button type="button" variant="outline" onClick={onRefresh}>Holatni yangilash</Button></div> : null}
    {state.outcome.kind === 'rejected' ? <p role="alert">{state.outcome.reason}</p> : null}
    {state.outcome.kind === 'not-sent' ? <p role="alert">{state.outcome.reason}</p> : null}
  </section>
}
