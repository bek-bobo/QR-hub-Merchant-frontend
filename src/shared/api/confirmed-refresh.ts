import type { InvalidateQueryFilters, QueryClient } from '@tanstack/react-query'

export type ConfirmedReadRefresh = 'updated' | 'skipped'

/** Invalidating inactive cache entries does not confirm a server refresh. */
export async function invalidateConfirmedQueries(client: QueryClient, filters: InvalidateQueryFilters): Promise<ConfirmedReadRefresh> {
  const active = client.getQueryCache().findAll({ ...filters, type: 'active' })
    .filter((query) => !query.isDisabled() && !query.isStatic())
  // TanStack resolves fetch failures (and paused reads); verify every attempted query below.
  await client.invalidateQueries({ ...filters, refetchType: 'active' })
  if (active.length === 0) return 'skipped'
  if (active.some((query) => client.getQueryCache().get(query.queryHash) !== query ||
    query.state.status !== 'success' || query.state.fetchStatus !== 'idle' || query.state.isInvalidated)) {
    throw new Error('Confirmed mutation reads could not be refreshed.')
  }
  return 'updated'
}
