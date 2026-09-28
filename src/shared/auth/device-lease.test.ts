import { describe, expect, it, vi } from 'vitest'
import { makeAuthApi, syntheticProfileA } from '@/test/auth-fakes'
import { LoginController } from './login-controller'
import {
  AUTH_OWNER_LOCK_NAME,
  AuthDeviceLease,
  DEVICE_KEY_STORAGE_KEY,
  type AuthOwnerLockManager,
  type DeviceKeyStorage,
} from './device-lease'

class FakeLockManager implements AuthOwnerLockManager {
  private held = false

  request(
    _name: typeof AUTH_OWNER_LOCK_NAME,
    _options: { readonly mode: 'exclusive'; readonly ifAvailable: true },
    callback: Parameters<AuthOwnerLockManager['request']>[2],
  ): Promise<void> {
    if (this.held) {
      return callback(null)
    }
    this.held = true
    return callback({ name: AUTH_OWNER_LOCK_NAME }).finally(() => {
      this.held = false
    })
  }
}

function storage() {
  const values = new Map<string, string>()
  const adapter: DeviceKeyStorage = {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => {
      values.set(key, value)
    }),
  }
  return { adapter, values }
}

const generatedUuid = '00000000-0000-4000-8000-000000000001'

describe('auth device lease', () => {
  it('persists only the generated device UUID after ownership is acquired', async () => {
    const store = storage()
    const lease = new AuthDeviceLease({
      storage: store.adapter,
      lockManager: new FakeLockManager(),
      generateUuid: () => generatedUuid,
    })

    await expect(lease.acquire()).resolves.toEqual({
      status: 'acquired',
      deviceUuid: generatedUuid,
    })
    expect(store.values).toEqual(new Map([[DEVICE_KEY_STORAGE_KEY, generatedUuid]]))
    lease.release()
  })

  it('returns busy for a second owner without reading or writing its storage', async () => {
    const lockManager = new FakeLockManager()
    const firstStore = storage()
    const secondStore = storage()
    const first = new AuthDeviceLease({
      storage: firstStore.adapter,
      lockManager,
      generateUuid: () => generatedUuid,
    })
    const second = new AuthDeviceLease({
      storage: secondStore.adapter,
      lockManager,
      generateUuid: () => generatedUuid,
    })
    await first.acquire()

    await expect(second.acquire()).resolves.toMatchObject({ status: 'busy' })
    expect(secondStore.adapter.getItem).not.toHaveBeenCalled()
    expect(secondStore.adapter.setItem).not.toHaveBeenCalled()
    first.release()
  })

  it('allows the next owner after release', async () => {
    const lockManager = new FakeLockManager()
    const first = new AuthDeviceLease({
      storage: storage().adapter,
      lockManager,
      generateUuid: () => generatedUuid,
    })
    const second = new AuthDeviceLease({
      storage: storage().adapter,
      lockManager,
      generateUuid: () => generatedUuid,
    })
    await first.acquire()
    first.release()
    await Promise.resolve()
    await Promise.resolve()

    await expect(second.acquire()).resolves.toMatchObject({ status: 'acquired' })
    second.release()
  })

  it('makes release and dispose idempotent', async () => {
    const lease = new AuthDeviceLease({
      storage: storage().adapter,
      lockManager: new FakeLockManager(),
      generateUuid: () => generatedUuid,
    })
    await lease.acquire()

    expect(() => {
      lease.release()
      lease.release()
      lease.dispose()
      lease.dispose()
    }).not.toThrow()
  })

  it('fails closed when the lock API is unsupported', async () => {
    const store = storage()
    const lease = new AuthDeviceLease({
      storage: store.adapter,
      lockManager: null,
      generateUuid: () => generatedUuid,
    })

    await expect(lease.acquire()).resolves.toMatchObject({
      status: 'unsupported',
    })
    expect(store.adapter.getItem).not.toHaveBeenCalled()
    expect(store.adapter.setItem).not.toHaveBeenCalled()
  })

  it('performs no auth request when ownership cannot be acquired', async () => {
    const createSession = vi.fn()
    const api = makeAuthApi({ createSession })
    const lease = new AuthDeviceLease({
      storage: storage().adapter,
      lockManager: null,
      generateUuid: () => generatedUuid,
    })
    const controller = new LoginController({
      api,
      lease,
      session: {
        establishSession: vi.fn().mockResolvedValue({
          status: 'authenticated',
          profile: syntheticProfileA,
          sessionScopeId: 'test-scope',
        }),
      },
      now: () => 0,
    })

    await controller.startLogin('998901234567')

    expect(createSession).not.toHaveBeenCalled()
    expect(controller.getSnapshot().phase).toBe('unavailable')
  })
})
