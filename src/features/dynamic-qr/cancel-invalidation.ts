import type { QueryClient } from '@tanstack/react-query'
import type { ReadScope } from '@/shared/contracts/merchant-read'
type ReadAccess = { readonly dynamicQrRead: boolean; readonly dashboardRead: boolean }

/** Cancel retains its independently sourced current-scope read invalidation policy. */
export function shouldInvalidateAfterCancel(queryKey: readonly unknown[], scope: ReadScope, access: ReadAccess): boolean {
  if (queryKey[0] !== scope.source || queryKey[1] !== scope.sessionScopeId ||
    queryKey[2] !== scope.accessRevision) return false
  return ((queryKey[3] === 'dynamic-qrs' || queryKey[3] === 'dynamic-qr-stats') && access.dynamicQrRead) ||
    (queryKey[3] === 'dashboard' && access.dashboardRead)
}

export async function invalidateConfirmedCancelReads(client: QueryClient, scope: ReadScope, access: ReadAccess): Promise<void> {
  await client.invalidateQueries({
    predicate: (query) => shouldInvalidateAfterCancel(query.queryKey, scope, access),
  })
}
