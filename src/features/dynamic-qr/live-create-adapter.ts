import { useMemo } from 'react'
import { useLiveWebContext, type LiveWebContext } from '@/app/read/useLiveWebContext'
import { readQueryPolicy } from '@/app/read/read-runtime'
import { readKeys } from '@/shared/api/read-keys'
import { safeHttpError } from '@/shared/api/errors'
import { can } from '@/shared/auth/access'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { endpoints } from '@/shared/contracts/endpoints'
import { decodeCurrencyOptionsResponse, type CurrencyOption } from '@/shared/contracts/currency.contract'
import { decodeCreateTerminalOptionsResponse, type CreateTerminalOption } from '@/shared/contracts/terminal-lookup.contract'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { createLiveCreateQrPort } from './live-create-port'
import { invalidateConfirmedCreateReads } from './create-invalidation'
import { buildCreateQrRequest, type CreateQrDraft, type CreateQrControllerDependencies } from './create-qr'

function sameScope(left: ReadScope, right: ReadScope) {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId && left.accessRevision === right.accessRevision
}

export function createLiveCreateQrAdapter(getCurrent: () => LiveWebContext, ownerScope: ReadScope) {
  const canCreate = () => {
    const snapshot = getCurrent().auth.getSessionSnapshot()
    return snapshot.phase === 'authenticated' && snapshot.profile.permissions.includes('CREATE_DYNAMIC_QR')
  }
  const getCurrentContext = () => {
    const { runtime, auth, queryClient } = getCurrent()
    const scope = runtime.getCurrentScope()
    const snapshot = auth.getSessionSnapshot()
    if (!sameScope(scope, ownerScope) || snapshot.phase !== 'authenticated' || snapshot.sessionScopeId !== scope.sessionScopeId) return null
    const terminals = queryClient.getQueryState<readonly CreateTerminalOption[]>([...readKeys.terminals(scope), 'create-limits'])
    const currencies = queryClient.getQueryState<readonly CurrencyOption[]>(readKeys.currencies(scope))
    if (terminals?.status !== 'success' || terminals.isInvalidated || currencies?.status !== 'success' || currencies.isInvalidated) return null
    return { scope, permissions: snapshot.profile.permissions, terminals: terminals.data ?? [], currencies: currencies.data ?? [] }
  }
  const port = createLiveCreateQrPort({ transport: null, getTransport: () => getCurrent().transport,
    protectedMutation: (operation) => getCurrent().auth.protectedMutation(operation), getCurrentContext })
  const controllerDependencies: CreateQrControllerDependencies = {
    currentScope: () => getCurrent().runtime.getCurrentScope(), canCreate,
    port: () => getCurrent().transport ? port : null,
    invalidateConfirmed: async (scope) => {
      const { runtime, auth, queryClient } = getCurrent()
      const snapshot = auth.getSessionSnapshot()
      if (snapshot.phase !== 'authenticated' || !snapshot.profile.permissions.includes('GET_DYNAMIC_QRS') ||
        !sameScope(scope, runtime.getCurrentScope())) return 'skipped'
      return invalidateConfirmedCreateReads(queryClient, scope, true)
    },
  }
  return {
    controllerDependencies, getCurrentContext, canCreate,
    port: controllerDependencies.port,
    requestForDraft: (draft: CreateQrDraft) => {
      const current = getCurrentContext()
      return current ? buildCreateQrRequest({ draft, terminals: current.terminals, currencies: current.currencies,
        terminalLookupAllowed: current.permissions.includes('GET_DROPDOWN_TERMINALS'),
        currencyLookupAllowed: current.permissions.includes('GET_CURRENCY_CODE') }) : null
    },
    terminalOptions: () => ({
      queryKey: [...readKeys.terminals(ownerScope), 'create-limits'],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const { auth, transport } = getCurrent()
        const before = auth.getSessionSnapshot()
        if (!transport || before.phase !== 'authenticated' || before.sessionScopeId !== ownerScope.sessionScopeId ||
          !before.profile.permissions.includes('GET_DROPDOWN_TERMINALS')) throw safeHttpError(403)
        const result = await auth.bridge.get({ transport, endpoint: endpoints.terminalLookup, decode: decodeCreateTerminalOptionsResponse }, signal)
        const after = getCurrent().auth.getSessionSnapshot()
        if (after.phase !== 'authenticated' || after.sessionScopeId !== before.sessionScopeId ||
          !after.profile.permissions.includes('GET_DROPDOWN_TERMINALS') || signal.aborted ||
          !sameScope(ownerScope, getCurrent().runtime.getCurrentScope())) throw safeHttpError(403)
        return result
      },
      enabled: Boolean(getCurrent().transport) && getCurrent().runtime.capabilities.terminalLookup,
      ...readQueryPolicy,
    }),
    currencyOptions: (currencyAllowed: boolean) => ({
      queryKey: readKeys.currencies(ownerScope),
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const { auth, transport } = getCurrent()
        const before = auth.getSessionSnapshot()
        if (!transport || before.phase !== 'authenticated' || before.sessionScopeId !== ownerScope.sessionScopeId ||
          !before.profile.permissions.includes('GET_CURRENCY_CODE')) throw safeHttpError(403)
        const result = await auth.bridge.get({ transport, endpoint: endpoints.currencies, decode: decodeCurrencyOptionsResponse }, signal)
        const after = getCurrent().auth.getSessionSnapshot()
        if (after.phase !== 'authenticated' || after.sessionScopeId !== before.sessionScopeId ||
          !after.profile.permissions.includes('GET_CURRENCY_CODE') || signal.aborted ||
          !sameScope(ownerScope, getCurrent().runtime.getCurrentScope())) throw safeHttpError(403)
        return result
      },
      enabled: Boolean(getCurrent().transport) && currencyAllowed,
      ...readQueryPolicy,
    }),
  }
}

export function useLiveCreateQrAdapter() {
  const { current, getCurrent } = useLiveWebContext()
  const currencyAllowed = can(useAccessContext(), 'currency.lookup', false)
  const scope = current.runtime.scope
  const adapter = useMemo(() => createLiveCreateQrAdapter(getCurrent, scope), [getCurrent, scope])
  return { adapter, available: Boolean(current.transport), currencyAllowed }
}
