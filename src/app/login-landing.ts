import { isLiveRouteAccessible } from './live-route-policy'
import { getLiveNavigationItems } from './navigation'
import type { ReadApiRegistrations } from './read/createLiveReadApi'
import type { AccessContextValue } from '@/shared/auth/access'
import { resolveSafeReturnTo } from './safe-return-to'

export interface LoginLandingInput {
  readonly state: unknown
  readonly primaryDestinations: readonly string[]
  readonly returnToAccessible: boolean
}

export interface LiveLoginLandingContextInput {
  readonly state: unknown
  readonly access: AccessContextValue
  readonly registrations: ReadApiRegistrations
}

export function buildLiveLoginLandingContext(
  input: LiveLoginLandingContextInput,
): LoginLandingInput {
  const returnTo =
    typeof input.state === 'object' && input.state !== null
      ? Reflect.get(input.state, 'returnTo')
      : undefined
  const safeReturnTo =
    typeof returnTo === 'string' && resolveSafeReturnTo(returnTo) === returnTo
      ? returnTo
      : null

  return {
    state: input.state,
    primaryDestinations: getLiveNavigationItems(input.access, input.registrations).map(
      (item) => item.path,
    ),
    returnToAccessible: safeReturnTo !== null && isLiveRouteAccessible(
      safeReturnTo,
      { access: input.access, registrations: input.registrations },
    ),
  }
}

export function resolveLoginLanding(input: LoginLandingInput): string {
  const returnTo =
    typeof input.state === 'object' && input.state !== null
      ? Reflect.get(input.state, 'returnTo')
      : undefined

  if (
    input.returnToAccessible &&
    typeof returnTo === 'string' &&
    resolveSafeReturnTo(returnTo) === returnTo
  ) {
    return returnTo
  }

  return input.primaryDestinations[0] ?? '/403'
}
