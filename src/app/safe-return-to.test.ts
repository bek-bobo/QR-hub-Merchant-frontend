import { describe, expect, it } from 'vitest'
import { resolveSafeReturnTo, resolveSafeReturnToState } from './safe-return-to'

describe('safe live return target', () => {
  it.each(['/account', '/dashboard', '/dynamic-qrs', '/dynamic-qrs/new', '/dynamic-qrs/export', '/static-qrs', '/terminals', '/bank-accounts', '/cashiers', '/cashiers/new', '/devices'])(
    'accepts the allowlisted path %s',
    (path) => {
      expect(resolveSafeReturnTo(path)).toBe(path)
    },
  )

  it.each([
    'https://example.com',
    '//example.com',
    'javascript:alert(1)',
    '/dev/auth',
    '/dev/read/dashboard',
    '/dev/day5/terminals',
    '/dev/day5/bank-accounts',
    '/dev/day5/cashiers',
    '/dev/day5/cashiers/new',
    '/p5',
    '/dev/day6/devices',
    '/unknown',
  ])('rejects the unsafe or unknown target %s', (target) => {
    expect(resolveSafeReturnTo(target)).toBe('/account')
  })

  it('reads only a string returnTo property from router state', () => {
    expect(resolveSafeReturnToState({ returnTo: '/dashboard' })).toBe(
      '/dashboard',
    )
    expect(resolveSafeReturnToState({ returnTo: 42 })).toBe('/account')
    expect(resolveSafeReturnToState(null)).toBe('/account')
    expect(resolveSafeReturnToState({ returnTo: '/static-qrs' })).toBe('/static-qrs')
    expect(resolveSafeReturnTo('/static-qrs/other')).toBe('/account')
    expect(resolveSafeReturnTo('/terminals/other')).toBe('/account')
    expect(resolveSafeReturnTo('/bank-accounts/other')).toBe('/account')
    expect(resolveSafeReturnTo('/cashiers/other')).toBe('/account')
    expect(resolveSafeReturnTo('/cashiers/new/other')).toBe('/account')
  })
})
