import type { HttpTransport } from '@/shared/api/http'
import type { ProtectedReadBridge } from '@/shared/api/protected-read'
import type { ProtectedReadContextValue } from '@/shared/api/ProtectedReadContext'
import { safeHttpError } from '@/shared/api/errors'
import { readKeys } from '@/shared/api/read-keys'
import { readQueryPolicy } from '@/app/read/read-runtime'
import { endpoints } from '@/shared/contracts/endpoints'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { decodeStaticQrPage } from './contract'
import { toStaticQrQuery, type StaticQrFilters } from './page-state'

interface StaticQrQueryDependencies {
  readonly scope: ReadScope
  readonly currentScope: () => ReadScope
  readonly filters: StaticQrFilters
  readonly staticReadAllowed: boolean
  readonly authReady: boolean
  readonly terminalConfirmed: boolean
  readonly transport: HttpTransport | null
  readonly bridge: ProtectedReadBridge
  readonly getSessionSnapshot: ProtectedReadContextValue['getSessionSnapshot']
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

export function createStaticQrQueryOptions(deps: StaticQrQueryDependencies) {
  const { scope, filters, transport, bridge, getSessionSnapshot } = deps
  const enabled = Boolean(transport) && deps.authReady && scope.source === 'live' &&
    deps.staticReadAllowed && deps.terminalConfirmed
  return {
    queryKey: readKeys.staticQrs(scope, filters.terminalId, filters.page, filters.size),
    queryFn: async ({ signal }: { readonly signal: AbortSignal }) => {
      const before = getSessionSnapshot()
      if (!enabled || !transport || signal.aborted || !sameScope(scope, deps.currentScope()) ||
        before.phase !== 'authenticated' || before.sessionScopeId !== scope.sessionScopeId ||
        !before.profile.permissions.includes('GET_STATIC_QRS')) throw safeHttpError(403)
      const result = await bridge.get({
        transport, endpoint: endpoints.staticQrs, query: toStaticQrQuery(filters), decode: decodeStaticQrPage,
      }, signal)
      const after = getSessionSnapshot()
      if (signal.aborted || !sameScope(scope, deps.currentScope()) ||
        after.phase !== 'authenticated' || after.sessionScopeId !== before.sessionScopeId ||
        !after.profile.permissions.includes('GET_STATIC_QRS')) throw safeHttpError(403)
      return result
    },
    enabled,
    ...readQueryPolicy,
  }
}
