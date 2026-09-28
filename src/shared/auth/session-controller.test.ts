import { describe, expect, it, vi } from 'vitest'
import {
  safeBusinessError,
  safeHttpError,
  safeNetworkError,
  safeTimeoutError,
} from '@/shared/api/errors'
import type { AdoptedAuthOwnerLease, SessionCache } from './session-controller'
import { SessionController } from './session-controller'
import type { Profile, TokenPair } from './model'
import {
  deferred,
  makeAuthApi,
  syntheticPairA,
  syntheticPairB,
  syntheticProfileA,
  syntheticProfileB,
} from '@/test/auth-fakes'

const shortPair: TokenPair = Object.freeze({
  ...syntheticPairA,
  accessTokenTtlMinutes: 1,
})

const bootstrapFailures: readonly [string, () => Promise<Profile>][] = [
  [
    'invalid profile',
    () => Promise.resolve({ ...syntheticProfileA, userId: '' }),
  ],
  ['403 profile', () => Promise.reject(safeHttpError(403))],
]

function setup() {
  let now = 0
  let nextScope = 0
  const cache: SessionCache = {
    cancel: vi.fn(),
    clear: vi.fn(),
  }
  const lease: AdoptedAuthOwnerLease = { release: vi.fn() }
  const api = makeAuthApi({
    getMe: vi.fn().mockResolvedValue(syntheticProfileA),
    refresh: vi.fn().mockResolvedValue(syntheticPairB),
    logout: vi.fn().mockResolvedValue(undefined),
  })
  const controller = new SessionController({
    api,
    cache,
    now: () => now,
    generateScopeId: () => `test-scope-${++nextScope}`,
  })
  return {
    api,
    cache,
    controller,
    lease,
    setNow: (value: number) => {
      now = value
    },
  }
}

describe('session controller', () => {
  it.each(bootstrapFailures)('does not authenticate after %s bootstrap', async (
    _label,
    getMe,
  ) => {
    const { api, controller, lease } = setup()
    vi.mocked(api.getMe).mockImplementationOnce(getMe)

    const result = await controller.establishSession(syntheticPairA, lease)

    expect(result.status).not.toBe('authenticated')
    expect(controller.getSnapshot().phase).not.toBe('authenticated')
    expect(lease.release).toHaveBeenCalledTimes(1)
  })

  it('shares one refresh flight across parallel protected reads and replaces the pair once', async () => {
    const refresh = deferred<TokenPair>()
    const { api, controller, lease, setNow } = setup()
    vi.mocked(api.refresh).mockReturnValueOnce(refresh.promise)
    await controller.establishSession(shortPair, lease)
    setNow(45_000)
    const usedAccessTokens: string[] = []
    const operation = vi.fn(async ({ accessToken }: { accessToken: string }) => {
      usedAccessTokens.push(accessToken)
      return 'ok'
    })

    const first = controller.protectedRead(operation)
    const second = controller.protectedRead(operation)
    expect(api.refresh).toHaveBeenCalledTimes(1)
    expect(operation).not.toHaveBeenCalled()

    refresh.resolve(syntheticPairB)
    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'success', data: 'ok' },
      { status: 'success', data: 'ok' },
    ])
    expect(usedAccessTokens).toEqual(['test-access-b', 'test-access-b'])
    expect(api.refresh).toHaveBeenCalledTimes(1)
  })

  it('does not start a second refresh for a late 401 from the replaced token', async () => {
    const oldAttempt = deferred<string>()
    const { api, controller, lease } = setup()
    await controller.establishSession(syntheticPairA, lease)
    const operation = vi
      .fn()
      .mockImplementationOnce(() => oldAttempt.promise)
      .mockResolvedValueOnce('replayed')

    const read = controller.protectedRead(operation)
    await Promise.resolve()
    await controller.ensureFreshSession(true)
    oldAttempt.reject(safeHttpError(401))

    await expect(read).resolves.toEqual({ status: 'success', data: 'replayed' })
    expect(api.refresh).toHaveBeenCalledTimes(1)
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['timeout', safeTimeoutError()],
    ['network', safeNetworkError()],
    ['invalid', safeBusinessError({ tag: 'REFRESH_TOKEN_INVALID' })],
    ['reuse', safeBusinessError({ tag: 'REFRESH_TOKEN_ALREADY_USED' })],
  ])('treats %s refresh failure as terminal without retry', async (_label, error) => {
    const { api, cache, controller, lease, setNow } = setup()
    vi.mocked(api.refresh).mockRejectedValue(error)
    await controller.establishSession(shortPair, lease)
    setNow(45_000)

    const result = await controller.ensureFreshSession()

    expect(result).toEqual({ status: 'terminal', reason: 'refresh-failed' })
    expect(api.refresh).toHaveBeenCalledTimes(1)
    expect(controller.getSnapshot()).toEqual({ phase: 'anonymous' })
    expect(lease.release).toHaveBeenCalledTimes(1)
    expect(cache.clear).toHaveBeenCalled()
  })

  it('does not let a refresh response resurrect a logged-out session', async () => {
    const refresh = deferred<TokenPair>()
    const { api, controller, lease, setNow } = setup()
    vi.mocked(api.refresh).mockReturnValueOnce(refresh.promise)
    await controller.establishSession(shortPair, lease)
    setNow(45_000)

    const read = controller.protectedRead(async () => 'protected')
    expect(api.refresh).toHaveBeenCalledTimes(1)
    const logout = controller.logout()
    refresh.resolve(syntheticPairB)
    await Promise.all([read, logout])

    expect(controller.getSnapshot()).toEqual({ phase: 'anonymous' })
    expect(lease.release).toHaveBeenCalledTimes(1)
  })

  it('returns access denied on 403 without refreshing', async () => {
    const { api, controller, lease } = setup()
    await controller.establishSession(syntheticPairA, lease)

    const result = await controller.protectedRead(async () => {
      throw safeHttpError(403)
    })

    expect(result).toEqual({ status: 'access-denied' })
    expect(api.refresh).not.toHaveBeenCalled()
  })

  it('replays a safe read at most once', async () => {
    const { api, controller, lease } = setup()
    await controller.establishSession(syntheticPairA, lease)
    const operation = vi.fn(async () => {
      throw safeHttpError(401)
    })

    const result = await controller.protectedRead(operation)

    expect(result).toEqual({ status: 'session-ended' })
    expect(api.refresh).toHaveBeenCalledTimes(1)
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('never automatically replays a mutation after dispatch', async () => {
    const { api, controller, lease } = setup()
    await controller.establishSession(syntheticPairA, lease)
    const operation = vi.fn(async () => {
      throw safeHttpError(401)
    })

    const result = await controller.protectedMutation(operation)

    expect(result).toEqual({ status: 'session-ended' })
    expect(operation).toHaveBeenCalledTimes(1)
    expect(api.refresh).not.toHaveBeenCalled()
  })

  it('fully replaces a changed profile and clears private cache', async () => {
    const { api, cache, controller, lease } = setup()
    await controller.establishSession(syntheticPairA, lease)
    vi.mocked(api.getMe).mockResolvedValueOnce(syntheticProfileB)

    const result = await controller.refreshProfile()
    const snapshot = controller.getSnapshot()

    expect(result).toMatchObject({ status: 'success', changed: true })
    expect(snapshot.phase).toBe('authenticated')
    if (snapshot.phase === 'authenticated') {
      expect(snapshot.profile.permissions).toEqual(['updated.permission'])
      expect(snapshot.profile.permissions).not.toContain('test.profile.read')
    }
    expect(cache.clear).toHaveBeenCalledTimes(2)
  })

  it('prevents an old profile response from restoring state after reset', async () => {
    const profile = deferred<Profile>()
    const { api, controller, lease } = setup()
    await controller.establishSession(syntheticPairA, lease)
    vi.mocked(api.getMe).mockReturnValueOnce(profile.promise)

    const refresh = controller.refreshProfile()
    await Promise.resolve()
    await controller.resetSession()
    profile.resolve(syntheticProfileB)

    await expect(refresh).resolves.toEqual({ status: 'session-ended' })
    expect(controller.getSnapshot()).toEqual({ phase: 'anonymous' })
  })

  it('clears cache and releases the lease on reset and logout', async () => {
    const { cache, controller, lease } = setup()
    await controller.establishSession(syntheticPairA, lease)
    await controller.resetSession()
    expect(lease.release).toHaveBeenCalledTimes(1)

    const secondLease: AdoptedAuthOwnerLease = { release: vi.fn() }
    await controller.establishSession(syntheticPairA, secondLease)
    await controller.logout()
    expect(secondLease.release).toHaveBeenCalledTimes(1)
    expect(cache.clear).toHaveBeenCalledTimes(4)
  })
})
