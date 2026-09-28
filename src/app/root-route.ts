import type { SessionSnapshot } from '@/shared/auth/session-controller'

export interface LiveRootRouteInput {
  readonly pathname: string
  readonly sessionPhase: SessionSnapshot['phase']
  readonly authenticatedLanding: string | null
}

export type LiveRootRouteDecision =
  | { readonly kind: 'not-found' }
  | { readonly kind: 'redirect'; readonly to: string }

export function resolveLiveRootRoute(
  input: LiveRootRouteInput,
): LiveRootRouteDecision {
  if (input.pathname !== '/') {
    return { kind: 'not-found' }
  }

  if (input.sessionPhase === 'anonymous') {
    return { kind: 'redirect', to: '/login' }
  }

  if (input.sessionPhase === 'authenticated' && input.authenticatedLanding !== null) {
    return { kind: 'redirect', to: input.authenticatedLanding }
  }

  return { kind: 'not-found' }
}
