export type LookupSelectState = 'loading' | 'ready' | 'empty' | 'error' | 'unavailable'

// Presentation only: keep request policy and parent/selection validation in the caller.
// Reusable for merchant, bank, terminal, region and district filter lookups.
export function resolveLookupSelectState(lookup: {
  readonly enabled: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly ids?: readonly string[]
}): LookupSelectState {
  if (lookup.error) return 'error'
  if (!lookup.enabled) return 'unavailable'
  if (lookup.pending || !lookup.ids) return 'loading'
  return lookup.ids.length ? 'ready' : 'empty'
}
