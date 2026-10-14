import { can, type AccessContextValue } from '@/shared/auth/access'
import type { SessionSnapshot } from '@/shared/auth/session-controller'
import type { ReadApiRegistrations } from './read/createLiveReadApi'

import { liveFeatureRouteDefinitions, accountRoutePolicy, createQrRoutePolicy, type LiveFeatureRoute } from './access-policy'
export { liveFeatureRouteDefinitions, type LiveFeatureRoute } from './access-policy'
export type LiveFeatureRouteDecision =
  | 'login'
  | 'pending'
  | 'forbidden'
  | 'unavailable'
  | 'allowed'


interface LiveFeatureRoutePolicyInput {
  readonly sessionPhase: SessionSnapshot['phase']
  readonly access: AccessContextValue
  readonly registrations: ReadApiRegistrations
}

interface LiveRouteAccessInput {
  readonly access: AccessContextValue
  readonly registrations: ReadApiRegistrations
}

function decideAuthenticatedFeatureAccess(
  definition: (typeof liveFeatureRouteDefinitions)[LiveFeatureRoute],
  input: LiveRouteAccessInput,
): 'forbidden' | 'unavailable' | 'allowed' {
  if (!can(input.access, definition.capability, false)) {
    return 'forbidden'
  }

  return input.registrations[definition.registration].kind === 'configured'
    ? 'allowed'
    : 'unavailable'
}

export function isLiveRouteAccessible(
  path: string,
  input: LiveRouteAccessInput,
): boolean {
  if (input.access.kind !== 'authenticated') {
    return false
  }

  if (path === '/403') {
    return true
  }

  if (path === accountRoutePolicy.path) {
    return can(input.access, accountRoutePolicy.capability, false)
  }

  if (path === '/cashiers/new') {
    return isLiveRouteAccessible('/cashiers', input)
  }

  if (path === createQrRoutePolicy.path) {
    return can(input.access, createQrRoutePolicy.capability, false)
  }

  const feature = Object.values(liveFeatureRouteDefinitions).find(
    (definition) => definition.path === path,
  )
  return feature !== undefined &&
    decideAuthenticatedFeatureAccess(feature, input) === 'allowed'
}

export function decideLiveFeatureRoute(
  route: LiveFeatureRoute,
  input: LiveFeatureRoutePolicyInput,
): LiveFeatureRouteDecision {
  if (
    input.sessionPhase === 'bootstrapping' ||
    input.sessionPhase === 'terminating'
  ) {
    return 'pending'
  }

  if (
    input.sessionPhase === 'anonymous' ||
    input.sessionPhase === 'bootstrap-error'
  ) {
    return 'login'
  }

  if (input.sessionPhase === 'access-denied') {
    return 'forbidden'
  }

  if (!Object.hasOwn(liveFeatureRouteDefinitions, route)) return 'forbidden'
  return decideAuthenticatedFeatureAccess(liveFeatureRouteDefinitions[route], input)
}
