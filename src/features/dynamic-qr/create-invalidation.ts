import type { QueryClient } from '@tanstack/react-query'
import type { ReadScope } from '@/shared/contracts/merchant-read'

export function shouldInvalidateAfterCreate(
  queryKey: readonly unknown[],
  scope: ReadScope,
  canReadDynamicQrs: boolean,
): boolean {
  if (queryKey[0] !== scope.source || queryKey[1] !== scope.sessionScopeId ||
    queryKey[2] !== scope.accessRevision) return false
  return canReadDynamicQrs && queryKey[3] === 'dynamic-qrs'
}

export async function invalidateConfirmedCreateReads(
  client: QueryClient,
  scope: ReadScope,
  canReadDynamicQrs: boolean,
): Promise<void> {
  await client.invalidateQueries({
    predicate: (query) => shouldInvalidateAfterCreate(query.queryKey, scope, canReadDynamicQrs),
  })
}
