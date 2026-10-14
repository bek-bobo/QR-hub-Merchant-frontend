import { describe, expect, it, vi } from 'vitest'
import { SessionController } from './session-controller'
import { canWithPermissions } from './access'
import { deferred, makeAuthApi, syntheticPairA } from '@/test/auth-fakes'
import { cashierPermissions, merchantPermissions, rbacProfile } from '@/test/rbac-fixtures'
import type { Profile } from './model'

function setup(getMe: () => Promise<Profile>) {
  const api = makeAuthApi({ getMe })
  let scopeId = 0
  const cache = { cancel: vi.fn(), clear: vi.fn() }
  const controller = new SessionController({ api, cache, now: () => 0, generateScopeId: () => `rbac-${++scopeId}` })
  const granted = () => {
    const snapshot = controller.getSnapshot()
    return snapshot.phase === 'authenticated' && canWithPermissions(snapshot.profile.permissions, 'p5.read')
  }
  return { controller, cache, api, granted }
}

describe('GET_ME permission snapshot lifecycle', () => {
  it('keeps permissions unavailable while GET_ME is pending and after its failure', async () => {
    const profile = deferred<Profile>()
    const h = setup(() => profile.promise)
    const result = h.controller.establishSession(syntheticPairA, { release: vi.fn() })
    await Promise.resolve()
    expect(h.controller.getSnapshot().phase).toBe('bootstrapping')
    expect(h.granted()).toBe(false)
    const read = vi.fn()
    await h.controller.protectedRead(read)
    expect(read).not.toHaveBeenCalled()
    profile.reject(new Error('GET_ME failed'))
    expect((await result).status).toBe('bootstrap-error')
    expect(h.granted()).toBe(false)
  })

  it('replaces grants on explicit profile refresh regardless of role identity', async () => {
    let profile = rbacProfile(merchantPermissions, ['ROLE_FUTURE'])
    const h = setup(async () => profile)
    await h.controller.establishSession(syntheticPairA, { release: vi.fn() })
    expect(h.granted()).toBe(true)
    profile = rbacProfile(cashierPermissions, ['ROLE_MERCHANT'])
    expect((await h.controller.refreshProfile()).status).toBe('success')
    expect(h.granted()).toBe(false)
    const snapshot = h.controller.getSnapshot()
    expect(snapshot.phase === 'authenticated' && canWithPermissions(snapshot.profile.permissions, 'cashier.read')).toBe(true)
    expect(h.cache.clear).toHaveBeenCalledTimes(2)
  })

  it('cannot restore old merchant grants when a late profile response arrives after account switching', async () => {
    const late = deferred<Profile>()
    const getMe = vi.fn().mockResolvedValueOnce(rbacProfile(merchantPermissions)).mockReturnValueOnce(late.promise)
      .mockResolvedValueOnce({ ...rbacProfile(cashierPermissions), userId: '102' })
    const h = setup(getMe)
    await h.controller.establishSession(syntheticPairA, { release: vi.fn() })
    const refresh = h.controller.refreshProfile()
    await vi.waitFor(() => expect(getMe).toHaveBeenCalledTimes(2))
    await h.controller.establishSession(syntheticPairA, { release: vi.fn() })
    late.resolve(rbacProfile(merchantPermissions))
    expect((await refresh).status).toBe('session-ended')
    expect(h.granted()).toBe(false)
    const snapshot = h.controller.getSnapshot()
    expect(snapshot.phase === 'authenticated' && snapshot.profile.userId).toBe('102')
    await h.controller.logout()
    expect(h.controller.getSnapshot().phase).toBe('anonymous')
    expect(h.granted()).toBe(false)
  })
})
