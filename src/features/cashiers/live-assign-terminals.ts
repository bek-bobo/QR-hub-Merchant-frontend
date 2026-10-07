import { useMemo } from 'react'
import { useCommittedGetter, useLiveWebContext, type LiveWebContext } from '@/app/read/useLiveWebContext'
import { ActionNotDispatchedError } from '@/shared/api/one-dispatch-action'
import { safeHttpError } from '@/shared/api/errors'
import { readKeys } from '@/shared/api/read-keys'
import { endpoints } from '@/shared/contracts/endpoints'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { Page, ReadScope, TerminalOption } from '@/shared/contracts/merchant-read'
import { invalidateCurrentCashierLists } from './create-cashier'
import { buildAssignTerminalsRequest, resolveCurrentAssignTarget, type AssignTerminalsDependencies, type AssignTerminalsPort } from './assign-terminals'

interface AssignEvidence {
  readonly target: CashierRow
  readonly resultData: Page<CashierRow>
  readonly resultKey: readonly unknown[]
  readonly dataUpdatedAt: number
  readonly scope: ReadScope
  readonly onConfirmed: () => void
}
function sameScope(left: ReadScope, right: ReadScope) {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId && left.accessRevision === right.accessRevision
}

export function createLiveAssignTerminalsAdapter(getCurrent: () => LiveWebContext, getEvidence: () => AssignEvidence): AssignTerminalsDependencies {
  const permitted = (permission: string) => {
    const snapshot = getCurrent().auth.getSessionSnapshot()
    return snapshot.phase === 'authenticated' && snapshot.profile.permissions.includes(permission)
  }
  const currentTarget = () => {
    const evidence = getEvidence()
    const { runtime, queryClient } = getCurrent()
    const state = queryClient.getQueryState<Page<CashierRow>>(evidence.resultKey)
    return resolveCurrentAssignTarget({ ...evidence,
      currentData: state?.status === 'success' ? state.data : undefined,
      currentUpdatedAt: state?.dataUpdatedAt, invalidated: state?.isInvalidated ?? true,
      currentScope: runtime.getCurrentScope(), canRead: permitted('GET_CASHIERS'), canAssign: permitted('ASSIGN_TERMINALS'),
    })
  }
  const currentOptions = (): readonly TerminalOption[] | null => {
    const { runtime, queryClient } = getCurrent()
    const { scope } = getEvidence()
    if (!sameScope(scope, runtime.getCurrentScope()) || !permitted('GET_DROPDOWN_TERMINALS')) return null
    const state = queryClient.getQueryState<readonly TerminalOption[]>(readKeys.terminals(scope))
    return state?.status === 'success' && !state.isInvalidated ? state.data ?? null : null
  }
  const port: AssignTerminalsPort = {
    async assign(request, intentScope) {
      let dispatched = false
      const result = await getCurrent().auth.protectedMutation(async ({ accessToken, signal }) => {
        const { runtime, transport } = getCurrent()
        const row = currentTarget()
        if (!transport || !row || !sameScope(intentScope, runtime.getCurrentScope()) || signal.aborted ||
          !buildAssignTerminalsRequest(row, request.terminalIds, currentOptions())) throw new ActionNotDispatchedError()
        dispatched = true
        const response = await transport.request({ endpoint: endpoints.assignCashierTerminals,
          credential: { kind: 'bearer', accessToken }, body: request, signal })
        if (!response.ok) throw safeHttpError(response.status)
        if (response.status !== 200) throw new Error('Assign response was not confirmed.')
        return response.body
      })
      if (result.status === 'success') return result.data
      if (!dispatched) throw new ActionNotDispatchedError()
      throw new Error('Dispatched assign outcome is unknown.')
    },
  }
  return {
    currentScope: () => getCurrent().runtime.getCurrentScope(), currentTarget, currentOptions,
    canAssign: () => permitted('ASSIGN_TERMINALS'),
    port: () => getCurrent().transport ? port : null,
    invalidateConfirmed: async (scope) => {
      const { runtime, queryClient } = getCurrent()
      if (!sameScope(scope, runtime.getCurrentScope())) return 'skipped'
      getEvidence().onConfirmed()
      return invalidateCurrentCashierLists(queryClient, scope, true)
    },
  }
}

export function useLiveAssignTerminalsAdapter(evidence: AssignEvidence) {
  const { getCurrent } = useLiveWebContext()
  const getEvidence = useCommittedGetter(evidence)
  return useMemo(() => createLiveAssignTerminalsAdapter(getCurrent, getEvidence), [getCurrent, getEvidence])
}
