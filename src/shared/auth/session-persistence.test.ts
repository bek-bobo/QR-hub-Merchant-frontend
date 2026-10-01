import { describe, expect, it, vi } from 'vitest'
import { safeHttpError, safeNetworkError } from '@/shared/api/errors'
import { decideLiveFeatureRoute } from '@/app/live-route-policy'
import { buildLiveLoginLandingContext, resolveLoginLanding } from '@/app/login-landing'
import { resolveSafeReturnTo } from '@/app/safe-return-to'
import type { ReadApiRegistrations } from '@/app/read/createLiveReadApi'
import { deferred, makeAuthApi, syntheticPairA, syntheticPairB, syntheticProfileA } from '@/test/auth-fakes'
import { AUTH_OWNER_BUSY_MESSAGE, AUTH_OWNER_LOCK_NAME, AuthDeviceLease, type AuthDeviceLeaseResult, type AuthOwnerLockManager } from './device-lease'
import { LoginController } from './login-controller'
import type { Profile } from './model'
import { SessionController } from './session-controller'
import { createTokenPersistence, REFRESH_TOKEN_STORAGE_KEY, TOKEN_METADATA_STORAGE_KEY } from './token-persistence'

function setup() {
  const values = new Map<string, string>()
  const persistence = createTokenPersistence({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) }, removeItem: (key) => { values.delete(key) },
  })
  const lease = {
    acquire: vi.fn<() => Promise<AuthDeviceLeaseResult>>().mockResolvedValue({ status: 'acquired', deviceUuid: '00000000-0000-4000-8000-000000000001' }),
    release: vi.fn(),
  }
  const cache = { cancel: vi.fn(), clear: vi.fn() }
  const api = makeAuthApi({ getMe: vi.fn().mockResolvedValue(syntheticProfileA),
    refresh: vi.fn().mockResolvedValue(syntheticPairB), logout: vi.fn().mockRejectedValue(safeNetworkError()),
    createSession: vi.fn().mockResolvedValue({ sessionKey: 'secret-stage', reply: { stage: 'otp' } }),
    sendOtp: vi.fn().mockResolvedValue({ stage: 'pin' }),
    checkPin: vi.fn().mockResolvedValue({ stage: 'done', tokenPair: syntheticPairA }),
  })
  const mount = () => new SessionController({ api, cache, persistence, restoreLease: lease,
    now: () => 1000, generateScopeId: () => 'restored-scope',
  })
  return { values, persistence, lease, cache, api, mount }
}

describe('persistent SessionController lifecycle', () => {
  it('persists final OTP/PIN tokens, never login stages, profile or permissions', async () => {
    const { mount, api, lease, values, persistence } = setup()
    const session = mount()
    await session.restoreSession()
    const login = new LoginController({ api, lease, session, now: () => 1000 })
    await login.startLogin('998900000000')
    expect(values.size).toBe(0)
    await login.submitPin('1234')
    expect(session.getSnapshot().phase).toBe('authenticated')
    expect(persistence.read()).toMatchObject({ kind: 'valid', pair: syntheticPairA })
    const saved = JSON.stringify([...values])
    for (const secret of ['secret-stage', '1234', syntheticProfileA.phone, 'permissions', 'roles', 'otp']) expect(saved).not.toContain(secret)
  })

  it('starts bootstrapping, validates restored credentials with GET_ME and blocks public operations meanwhile', async () => {
    const { mount, api, persistence, lease } = setup()
    persistence.write(syntheticPairA, 601000)
    const profile = deferred<Profile>()
    vi.mocked(api.getMe).mockReturnValueOnce(profile.promise)
    const session = mount()
    expect(session.getSnapshot().phase).toBe('bootstrapping')
    const restore = session.restoreSession()
    expect(session.restoreSession()).toBe(restore)
    await Promise.resolve()
    await Promise.resolve()
    const mutation = vi.fn()
    expect((await session.protectedMutation(mutation)).status).not.toBe('success')
    expect(mutation).not.toHaveBeenCalled()
    profile.resolve(syntheticProfileA)
    expect((await restore).status).toBe('authenticated')
    expect(api.getMe).toHaveBeenCalledWith(syntheticPairA.accessToken, expect.anything())
    expect(lease.release).not.toHaveBeenCalled()
  })

  it('refreshes a restored 401 once, persists rotation and replays GET_ME once', async () => {
    const { mount, api, persistence, values } = setup()
    persistence.write(syntheticPairA, 601000)
    vi.mocked(api.getMe).mockRejectedValueOnce(safeHttpError(401)).mockResolvedValueOnce(syntheticProfileA)
    expect((await mount().restoreSession()).status).toBe('authenticated')
    expect(api.refresh).toHaveBeenCalledTimes(1)
    expect(api.refresh).toHaveBeenCalledWith(syntheticPairA.refreshToken, expect.anything())
    expect(api.getMe).toHaveBeenCalledTimes(2)
    expect(vi.mocked(api.getMe).mock.calls[1]?.[0]).toBe(syntheticPairB.accessToken)
    expect(values.get(REFRESH_TOKEN_STORAGE_KEY)).toBe(syntheticPairB.refreshToken)
  })

  it('uses the persisted deadline rather than granting a new TTL on reload', async () => {
    const { mount, api, persistence } = setup()
    persistence.write(syntheticPairA, 500)
    await mount().restoreSession()
    expect(api.refresh).toHaveBeenCalledTimes(1)
    expect(api.getMe).toHaveBeenCalledTimes(1)
    expect(vi.mocked(api.getMe).mock.calls[0]?.[0]).toBe(syntheticPairB.accessToken)
  })

  it('does not refresh twice if GET_ME rejects the token obtained during expiry preflight', async () => {
    const { mount, api, persistence, values } = setup()
    persistence.write(syntheticPairA, 500)
    vi.mocked(api.getMe).mockRejectedValue(safeHttpError(401))
    const session = mount()
    await session.restoreSession()
    expect(api.refresh).toHaveBeenCalledTimes(1)
    expect(api.getMe).toHaveBeenCalledTimes(1)
    expect(session.getSnapshot().phase).toBe('anonymous')
    expect(values.size).toBe(0)
  })

  it('clears invalid refresh state, memory and cache and releases ownership', async () => {
    const { mount, api, persistence, lease, values, cache } = setup()
    persistence.write(syntheticPairA, 601000)
    vi.mocked(api.getMe).mockRejectedValueOnce(safeHttpError(401))
    vi.mocked(api.refresh).mockRejectedValueOnce(safeHttpError(401))
    const session = mount()
    await session.restoreSession()
    expect(session.getSnapshot()).toEqual({ phase: 'anonymous' })
    expect(values.size).toBe(0)
    expect(lease.release).toHaveBeenCalledTimes(1)
    expect(cache.cancel).toHaveBeenCalled()
    expect(cache.clear).toHaveBeenCalled()
    expect((await session.protectedRead(vi.fn())).status).toBe('anonymous')
  })

  it('clears local and persistent credentials despite remote logout failure', async () => {
    const { mount, persistence, lease, values, cache } = setup()
    persistence.write(syntheticPairA, 601000)
    const session = mount()
    await session.restoreSession()
    expect(await session.logout()).toEqual({ status: 'local-cleared-remote-unconfirmed' })
    expect(values.size).toBe(0)
    expect(session.getSnapshot().phase).toBe('anonymous')
    expect(lease.release).toHaveBeenCalledTimes(1)
    expect(cache.clear).toHaveBeenCalled()
  })

  it('does not authenticate a second tab or clear the owner tokens when the lease is busy', async () => {
    const { mount, persistence, lease, api } = setup()
    persistence.write(syntheticPairA, 601000)
    vi.mocked(lease.acquire).mockResolvedValueOnce({ status: 'busy', message: AUTH_OWNER_BUSY_MESSAGE })
    const session = mount()
    expect(await session.restoreSession()).toEqual({ status: 'lease-unavailable', message: AUTH_OWNER_BUSY_MESSAGE })
    expect(session.getSnapshot().phase).toBe('anonymous')
    expect(api.getMe).not.toHaveBeenCalled()
    await session.resetSession()
    await session.dispose()
    expect(persistence.read().kind).toBe('valid')
    expect((await mount().restoreSession()).status).toBe('authenticated')
  })

  it('clears corrupted persisted state and remains anonymous without calling GET_ME', async () => {
    const { mount, persistence, values, api, lease } = setup()
    persistence.write(syntheticPairA, 601000)
    values.set(TOKEN_METADATA_STORAGE_KEY, '{')
    const session = mount()
    await session.restoreSession()
    expect(values.size).toBe(0)
    expect(session.getSnapshot().phase).toBe('anonymous')
    expect(api.getMe).not.toHaveBeenCalled()
    expect(lease.release).toHaveBeenCalledTimes(1)
  })

  it('uses bootstrap-error semantics for transient GET_ME failure without a stale profile', async () => {
    const { mount, api, persistence } = setup()
    persistence.write(syntheticPairA, 601000)
    vi.mocked(api.getMe).mockRejectedValueOnce(safeNetworkError())
    const session = mount()
    await session.restoreSession()
    expect(session.getSnapshot()).toEqual({ phase: 'bootstrap-error' })
  })

  it('rejects a malformed GET_ME profile and clears restore credentials', async () => {
    const { mount, api, persistence, lease, values } = setup()
    persistence.write(syntheticPairA, 601000)
    vi.mocked(api.getMe).mockResolvedValueOnce({ ...syntheticProfileA, userId: '' })
    const session = mount()
    await session.restoreSession()
    expect(session.getSnapshot().phase).toBe('bootstrap-error')
    expect(values.size).toBe(0)
    expect(lease.release).toHaveBeenCalledTimes(1)
  })

  it('does not commit a late rotated pair after reset', async () => {
    const { mount, api, persistence, values } = setup()
    persistence.write(syntheticPairA, 500)
    const refreshStarted = deferred<void>()
    const replacement = deferred<typeof syntheticPairB>()
    vi.mocked(api.refresh).mockImplementationOnce(() => { refreshStarted.resolve(undefined); return replacement.promise })
    const session = mount()
    const restore = session.restoreSession()
    await refreshStarted.promise
    await session.resetSession()
    replacement.resolve(syntheticPairB)
    await restore
    expect(values.size).toBe(0)
    expect(session.getSnapshot().phase).toBe('anonymous')
    expect(api.getMe).not.toHaveBeenCalled()
  })

  it('clears a cancelled restore once its pending lease is acquired', async () => {
    const { mount, persistence, lease, api, values } = setup()
    persistence.write(syntheticPairA, 601000)
    const acquisition = deferred<AuthDeviceLeaseResult>()
    vi.mocked(lease.acquire).mockReturnValueOnce(acquisition.promise)
    const session = mount()
    const restore = session.restoreSession()
    await session.resetSession()
    acquisition.resolve({ status: 'acquired', deviceUuid: '00000000-0000-4000-8000-000000000001' })
    expect(await restore).toEqual({ status: 'stale' })
    expect(values.size).toBe(0)
    expect(lease.release).toHaveBeenCalledTimes(1)
    expect(api.getMe).not.toHaveBeenCalled()
  })

  it('keeps one runtime refresh flight and persists only its replacement pair', async () => {
    const { mount, api, persistence } = setup()
    persistence.write(syntheticPairA, 601000)
    const session = mount()
    await session.restoreSession()
    const replacement = deferred<typeof syntheticPairB>()
    vi.mocked(api.refresh).mockReturnValueOnce(replacement.promise)
    const first = session.ensureFreshSession(true)
    const second = session.ensureFreshSession(true)
    expect(api.refresh).toHaveBeenCalledTimes(1)
    replacement.resolve(syntheticPairB)
    expect(await Promise.all([first, second])).toEqual([{ status: 'fresh' }, { status: 'fresh' }])
    expect(persistence.read()).toMatchObject({ kind: 'valid', pair: syntheticPairB })
  })

  it('preserves durable credentials across provider teardown and validates them again on a new lifecycle', async () => {
    const { mount, api, persistence } = setup()
    persistence.write(syntheticPairA, 601000)
    const first = mount()
    await first.restoreSession()
    await first.dispose()
    expect(first.getSnapshot().phase).toBe('anonymous')
    expect(persistence.read().kind).toBe('valid')
    const second = mount()
    await second.restoreSession()
    expect(second.getSnapshot().phase).toBe('authenticated')
    expect(api.getMe).toHaveBeenCalledTimes(2)
  })

  it('retains the requested permitted route and existing safe-return and permission checks', async () => {
    const { mount, api, persistence } = setup()
    const profile = { ...syntheticProfileA, permissions: ['GET_DYNAMIC_QRS'] }
    vi.mocked(api.getMe).mockResolvedValueOnce(profile)
    persistence.write(syntheticPairA, 601000)
    const registrations: ReadApiRegistrations = {
      dashboard: { kind: 'configured' }, dynamicQr: { kind: 'configured' },
      terminalLookup: { kind: 'unavailable', reason: 'unused' }, terminalList: { kind: 'unavailable', reason: 'unused' },
      bankAccountList: { kind: 'unavailable', reason: 'unused' }, cashierList: { kind: 'unavailable', reason: 'unused' },
      merchantLookup: { kind: 'unavailable', reason: 'unused' }, bankAccountLookup: { kind: 'unavailable', reason: 'unused' },
      p5List: { kind: 'unavailable', reason: 'unused' },
    }
    const session = mount()
    expect(decideLiveFeatureRoute('dynamicQr', { sessionPhase: session.getSnapshot().phase,
      access: { kind: 'anonymous' }, registrations })).toBe('pending')
    await session.restoreSession()
    const access = { kind: 'authenticated' as const, permissions: new Set(profile.permissions) }
    expect(resolveLoginLanding(buildLiveLoginLandingContext({ state: { returnTo: '/dynamic-qrs' }, access, registrations }))).toBe('/dynamic-qrs')
    expect(decideLiveFeatureRoute('dynamicQr', { sessionPhase: session.getSnapshot().phase, access, registrations })).toBe('allowed')
    expect(decideLiveFeatureRoute('dashboard', { sessionPhase: session.getSnapshot().phase, access, registrations })).toBe('forbidden')
    expect(resolveSafeReturnTo('https://example.com')).toBe('/account')
  })

  it('keeps runtime login usable when token storage throws and falls back safely on startup', async () => {
    const { api, cache, lease } = setup()
    const persistence = createTokenPersistence({ getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('quota') }, removeItem: () => { throw new Error('denied') },
    })
    const session = new SessionController({ api, cache,
      persistence, restoreLease: lease, now: () => 1000, generateScopeId: () => 'scope',
    })
    await session.restoreSession()
    expect(session.getSnapshot().phase).toBe('anonymous')
    expect(lease.acquire).not.toHaveBeenCalled()
    expect((await session.establishSession(syntheticPairA, lease)).status).toBe('authenticated')
  })

  it('never replays a protected mutation after restore', async () => {
    const { mount, persistence, api, values } = setup()
    persistence.write(syntheticPairA, 601000)
    const session = mount()
    await session.restoreSession()
    const mutation = vi.fn().mockRejectedValue(safeHttpError(401))
    await session.protectedMutation(mutation)
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(api.refresh).not.toHaveBeenCalled()
    expect(values.size).toBe(0)
  })

  it('enforces the real exclusive lease across two controllers sharing persistent tokens', async () => {
    const { persistence, values, api, cache } = setup()
    persistence.write(syntheticPairA, 601000)
    let held = false
    const lockManager: AuthOwnerLockManager = {
      request: (_name, _options, callback) => {
        if (held) return callback(null)
        held = true
        return callback({ name: AUTH_OWNER_LOCK_NAME }).finally(() => { held = false })
      },
    }
    function owner() {
      const lease = new AuthDeviceLease({ lockManager,
        storage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } },
        generateUuid: () => '00000000-0000-4000-8000-000000000001',
      })
      const session = new SessionController({ api, cache, persistence, restoreLease: lease,
        now: () => 1000, generateScopeId: () => 'scope',
      })
      return { session, lease }
    }
    const first = owner()
    const second = owner()
    await first.session.restoreSession()
    expect(await second.session.restoreSession()).toEqual({ status: 'lease-unavailable', message: AUTH_OWNER_BUSY_MESSAGE })
    expect(first.session.getSnapshot().phase).toBe('authenticated')
    expect(second.session.getSnapshot().phase).toBe('anonymous')
    expect(api.getMe).toHaveBeenCalledTimes(1)
    await expect(first.session.protectedRead(async () => 'ok')).resolves.toEqual({ status: 'success', data: 'ok' })
    await first.session.dispose()
    await Promise.resolve()
    expect((await second.session.restoreSession()).status).toBe('authenticated')
    await second.session.dispose()
    first.lease.dispose()
    second.lease.dispose()
  })
})
