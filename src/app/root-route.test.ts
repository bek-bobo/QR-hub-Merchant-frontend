import { describe, expect, it } from 'vitest'
import { resolveLiveRootRoute } from './root-route'

describe('live root route decision', () => {
  it('redirects an unauthenticated root visit to login', () => {
    expect(resolveLiveRootRoute({
      pathname: '/',
      sessionPhase: 'anonymous',
      authenticatedLanding: null,
    })).toEqual({ kind: 'redirect', to: '/login' })
  })

  it('keeps root unresolved when authenticated landing is unavailable', () => {
    expect(resolveLiveRootRoute({
      pathname: '/',
      sessionPhase: 'authenticated',
      authenticatedLanding: null,
    })).toEqual({ kind: 'not-found' })
  })

  it.each(['/dashboard', '/dynamic-qrs', '/403'])(
    'redirects authenticated root to the supplied landing %s',
    (authenticatedLanding) => {
      expect(resolveLiveRootRoute({
        pathname: '/',
        sessionPhase: 'authenticated',
        authenticatedLanding,
      })).toEqual({ kind: 'redirect', to: authenticatedLanding })
    },
  )

  it('keeps an unknown non-root path on the not-found path', () => {
    expect(resolveLiveRootRoute({
      pathname: '/does-not-exist',
      sessionPhase: 'authenticated',
      authenticatedLanding: '/dashboard',
    })).toEqual({ kind: 'not-found' })
  })
})
