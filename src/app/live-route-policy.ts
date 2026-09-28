import { can, type AccessContextValue, type Capability } from '@/shared/auth/access'
import type { SessionSnapshot } from '@/shared/auth/session-controller'
import type { ReadApiRegistrations } from './read/createLiveReadApi'

export type LiveFeatureRoute = 'dashboard' | 'dynamicQr' | 'exportQr' | 'staticQr' | 'terminals' | 'bankAccounts' | 'cashiers' | 'cashierCreate' | 'devices'
export type LiveFeatureRouteDecision =
  | 'login'
  | 'pending'
  | 'forbidden'
  | 'unavailable'
  | 'allowed'

export const liveFeatureRouteDefinitions = {
  dashboard: {
    path: '/dashboard',
    capability: 'dashboard.read',
    registration: 'dashboard',
  },
  dynamicQr: {
    path: '/dynamic-qrs',
    capability: 'dynamicQr.read',
    registration: 'dynamicQr',
  },
  exportQr: {
    path: '/dynamic-qrs/export',
    capability: 'dynamicQr.export',
    // Shared web-base registration; the read capability is checked separately.
    registration: 'dynamicQr',
  },
  staticQr: {
    path: '/static-qrs',
    capability: 'staticQr.read',
    // Both list APIs use the same validated web base; grants remain independent.
    registration: 'dynamicQr',
  },
  terminals: {
    path: '/terminals',
    capability: 'terminal.read',
    registration: 'terminalList',
  },
  bankAccounts: {
    path: '/bank-accounts',
    capability: 'bankAccount.read',
    registration: 'bankAccountList',
  },
  cashiers: {
    path: '/cashiers',
    capability: 'cashier.read',
    registration: 'cashierList',
  },
  cashierCreate: {
    path: '/cashiers/new',
    capability: 'cashier.create',
    // Registration reflects the shared web base only; no cashier.read grant is checked.
    registration: 'cashierList',
  },
  devices: {
    path: '/devices',
    capability: 'p5.read',
    registration: 'p5List',
  },
} as const satisfies Record<
  LiveFeatureRoute,
  {
    readonly path: string
    readonly capability: Capability
    readonly registration: keyof ReadApiRegistrations
  }
>

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

  if (path === '/account') {
    return can(input.access, 'profile.read', false)
  }

  if (path === '/dynamic-qrs/new') {
    return can(input.access, 'dynamicQr.create', false)
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

  return decideAuthenticatedFeatureAccess(liveFeatureRouteDefinitions[route], input)
}
