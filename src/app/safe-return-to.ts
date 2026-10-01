export const defaultLiveLanding = '/account'

const safeLiveReturnTargets = new Set([
  '/account',
  '/dashboard',
  '/dynamic-qrs',
  '/static-qrs',
  '/terminals',
  '/bank-accounts',
  '/cashiers',
  '/dynamic-qrs/new',
  '/dynamic-qrs/export',
  '/devices',
])

export function resolveSafeReturnTo(value: unknown): string {
  return typeof value === 'string' && safeLiveReturnTargets.has(value)
    ? value
    : defaultLiveLanding
}

export function resolveSafeReturnToState(state: unknown): string {
  if (typeof state !== 'object' || state === null) {
    return defaultLiveLanding
  }

  return resolveSafeReturnTo(Reflect.get(state, 'returnTo'))
}
