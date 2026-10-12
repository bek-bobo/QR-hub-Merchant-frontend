import { useMemo } from 'react'
import { useCommittedGetter, useLiveWebContext, type LiveWebContext } from '@/app/read/useLiveWebContext'
import { ActionNotDispatchedError } from '@/shared/api/one-dispatch-action'
import { safeHttpError } from '@/shared/api/errors'
import { endpoints } from '@/shared/contracts/endpoints'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'
import { invalidateCurrentCashierLists } from './create-cashier'
import { resolveCurrentUnassignTarget, type UnassignDependencies, type UnassignPort, type UnassignTarget } from './unassign-terminal'

interface UnassignEvidence {
  readonly target: UnassignTarget
  readonly resultData: Page<CashierRow>
  readonly resultKey: readonly unknown[]
  readonly dataUpdatedAt: number
  readonly scope: ReadScope
  readonly getSelectedTarget: () => UnassignTarget | null
  readonly onConfirmed: () => void
}
function sameScope(left: ReadScope, right: ReadScope) {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId && left.accessRevision === right.accessRevision
}

export function createLiveUnassignTerminalAdapter(getCurrent: () => LiveWebContext, getEvidence: () => UnassignEvidence): UnassignDependencies {
  const permitted = (permission: string) => {
    const snapshot = getCurrent().auth.getSessionSnapshot()
    return snapshot.phase === 'authenticated' && snapshot.profile.permissions.includes(permission)
  }
  const currentEvidence = () => {
    const evidence = getEvidence()
    const { runtime, queryClient } = getCurrent()
    const state = queryClient.getQueryState<Page<CashierRow>>(evidence.resultKey)
    return resolveCurrentUnassignTarget({ ...evidence,
      currentData: state?.status === 'success' ? state.data : undefined,
      currentUpdatedAt: state?.dataUpdatedAt, invalidated: state?.isInvalidated ?? true,
      currentScope: runtime.getCurrentScope(), canRead: permitted('GET_CASHIERS'), canUnassign: permitted('UNASSIGN_TERMINAL'),
    })
  }
  const currentTarget = () => {
    const { target, getSelectedTarget } = getEvidence()
    const selection = getSelectedTarget()
    return selection && selection.cashier === target.cashier && selection.terminal === target.terminal && currentEvidence() ? selection : null
  }
  const port: UnassignPort = {
    async unassign(query, intentScope) {
      const selectedAtStart = currentTarget()
      let dispatched = false
      const result = await getCurrent().auth.protectedMutation(async ({ accessToken, signal }) => {
        const { runtime, transport } = getCurrent()
        const current = currentTarget()
        if (!transport || !current || current !== selectedAtStart || !sameScope(intentScope, runtime.getCurrentScope()) ||
          current.cashier.id !== query.cashierId || current.terminal.id !== query.terminalId || signal.aborted) throw new ActionNotDispatchedError()
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
  }
  return {
    currentScope: () => getCurrent().runtime.getCurrentScope(), currentTarget, currentEvidence,
    canUnassign: () => permitted('UNASSIGN_TERMINAL'),
    port: () => getCurrent().transport ? port : null,
    invalidateConfirmed: async (scope) => {
      const { runtime, queryClient } = getCurrent()
      if (!sameScope(scope, runtime.getCurrentScope())) return 'skipped'
      getEvidence().onConfirmed()
      return invalidateCurrentCashierLists(queryClient, scope, true)
    },
  }
}

export function useLiveUnassignTerminalAdapter(evidence: UnassignEvidence) {
  const { getCurrent } = useLiveWebContext()
  const getEvidence = useCommittedGetter(evidence)
  return useMemo(() => createLiveUnassignTerminalAdapter(getCurrent, getEvidence), [getCurrent, getEvidence])
}
