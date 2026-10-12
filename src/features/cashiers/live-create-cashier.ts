import { useMemo } from 'react'
import { useLiveWebContext, type LiveWebContext } from '@/app/read/useLiveWebContext'
import { ActionNotDispatchedError } from '@/shared/api/one-dispatch-action'
import { safeHttpError } from '@/shared/api/errors'
import { readKeys } from '@/shared/api/read-keys'
import { endpoints } from '@/shared/contracts/endpoints'
import type { ReadScope, TerminalOption } from '@/shared/contracts/merchant-read'
import type { CashierCreateAdapter } from './cashier-create-adapter'
import { buildCashierCreateRequest, invalidateCurrentCashierLists, type CashierCreatePort } from './create-cashier'

function sameScope(left: ReadScope, right: ReadScope) {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId && left.accessRevision === right.accessRevision
}

export function createLiveCashierCreateAdapter(getCurrent: () => LiveWebContext, ownerScope: ReadScope): CashierCreateAdapter {
  const permitted = (permission: string) => {
    const snapshot = getCurrent().auth.getSessionSnapshot()
    return snapshot.phase === 'authenticated' && snapshot.profile.permissions.includes(permission)
  }
  const currentOptions = (): readonly TerminalOption[] | null => {
    const { runtime, queryClient } = getCurrent()
    const scope = runtime.getCurrentScope()
    if (!sameScope(scope, ownerScope) || !permitted('GET_DROPDOWN_TERMINALS')) return null
    const state = queryClient.getQueryState<readonly TerminalOption[]>(readKeys.terminals(scope))
    return state?.status === 'success' && !state.isInvalidated ? state.data ?? null : null
  }
  const port: CashierCreatePort = {
    async create(request, scope) {
      let dispatched = false
      const result = await getCurrent().auth.protectedMutation(async ({ accessToken, signal }) => {
        const { runtime, queryClient, transport } = getCurrent()
        const lookup = queryClient.getQueryState<readonly TerminalOption[]>(readKeys.terminals(runtime.getCurrentScope()))
        if (!transport || !sameScope(scope, runtime.getCurrentScope()) || !permitted('CREATE_CASHIER') ||
          !permitted('GET_DROPDOWN_TERMINALS') || lookup?.status !== 'success' || lookup.isInvalidated ||
          !buildCashierCreateRequest(request, lookup.data ?? null)) throw new ActionNotDispatchedError()
        dispatched = true
        const response = await transport.request({ endpoint: endpoints.createCashier,
          credential: { kind: 'bearer', accessToken }, body: request, signal })
        if (!response.ok) throw safeHttpError(response.status)
        if (response.status !== 200) throw new Error('Cashier create response was not confirmed.')
        return response.body
      })
      if (result.status === 'success') return result.data
      if (!dispatched) throw new ActionNotDispatchedError()
      throw new Error('Dispatched cashier create outcome is unknown.')
    },
  }
  return {
    currentScope: () => getCurrent().runtime.getCurrentScope(),
    canCreate: () => permitted('CREATE_CASHIER'),
    canReadList: () => permitted('GET_CASHIERS'),
    currentTerminalOptions: currentOptions,
    port: () => getCurrent().transport ? port : null,
    invalidateConfirmed: async (scope) => {
      const { runtime, queryClient } = getCurrent()
      if (!permitted('GET_CASHIERS') || !sameScope(scope, runtime.getCurrentScope())) return 'skipped'
      return invalidateCurrentCashierLists(queryClient, scope, true)
    },
  }
}

export function useLiveCashierCreateAdapter() {
  const { current, getCurrent } = useLiveWebContext()
  const scope = current.runtime.scope
  return useMemo(() => createLiveCashierCreateAdapter(getCurrent, scope), [getCurrent, scope])
}
