export const DEVICE_KEY_STORAGE_KEY = 'qrhub.device-key.v1'
export const AUTH_OWNER_LOCK_NAME = 'qrhub:auth-owner:v1'

export const AUTH_OWNER_BUSY_MESSAGE =
  'Hisob boshqa oynada ochiq. O‘sha oynani yoping yoki undan chiqing, keyin qayta urinib ko‘ring.'

const authUnsupportedMessage =
  'Ushbu brauzerda xavfsiz kirish qo‘llab-quvvatlanmaydi.'
const deviceStorageUnavailableMessage =
  'Qurilma identifikatorini xavfsiz saqlab bo‘lmadi.'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface DeviceKeyStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type DeviceUuidGenerator = () => string

export interface AuthOwnerLock {
  readonly name?: string
}

export interface AuthOwnerLockManager {
  request(
    name: typeof AUTH_OWNER_LOCK_NAME,
    options: {
      readonly mode: 'exclusive'
      readonly ifAvailable: true
    },
    callback: (lock: AuthOwnerLock | null) => Promise<void>,
  ): Promise<void>
}

export interface AuthDeviceLeaseDependencies {
  readonly storage: DeviceKeyStorage
  readonly lockManager: AuthOwnerLockManager | null
  readonly generateUuid: DeviceUuidGenerator | null
}

export interface AcquiredAuthDeviceLease {
  readonly status: 'acquired'
  readonly deviceUuid: string
}

export interface BusyAuthDeviceLease {
  readonly status: 'busy'
  readonly message: typeof AUTH_OWNER_BUSY_MESSAGE
}

export interface UnsupportedAuthDeviceLease {
  readonly status: 'unsupported'
  readonly message: string
}

export interface StorageUnavailableAuthDeviceLease {
  readonly status: 'storage-unavailable'
  readonly message: string
}

export type AuthDeviceLeaseResult =
  | AcquiredAuthDeviceLease
  | BusyAuthDeviceLease
  | UnsupportedAuthDeviceLease
  | StorageUnavailableAuthDeviceLease

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly settled: () => boolean
}

interface ActiveLease {
  readonly attempt: number
  readonly deviceUuid: string
  readonly releaseLock: () => void
}

function createDeferred<T>(): Deferred<T> {
  let isSettled = false
  let resolvePromise: (value: T) => void = () => undefined

  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    resolve: (value) => {
      if (isSettled) {
        return
      }

      isSettled = true
      resolvePromise(value)
    },
    settled: () => isSettled,
  }
}

function isValidUuid(value: string): boolean {
  return uuidPattern.test(value)
}

function unsupportedResult(): UnsupportedAuthDeviceLease {
  return {
    status: 'unsupported',
    message: authUnsupportedMessage,
  }
}

function storageUnavailableResult(): StorageUnavailableAuthDeviceLease {
  return {
    status: 'storage-unavailable',
    message: deviceStorageUnavailableMessage,
  }
}

export class AuthDeviceLease {
  private readonly dependencies: AuthDeviceLeaseDependencies
  private attempt = 0
  private activeLease: ActiveLease | null = null
  private pendingAcquire: Promise<AuthDeviceLeaseResult> | null = null
  private pendingAttempt: number | null = null
  private disposed = false

  constructor(dependencies: AuthDeviceLeaseDependencies) {
    this.dependencies = dependencies
  }

  async acquire(): Promise<AuthDeviceLeaseResult> {
    if (this.disposed) {
      return unsupportedResult()
    }

    if (this.activeLease) {
      return {
        status: 'acquired',
        deviceUuid: this.activeLease.deviceUuid,
      }
    }

    if (this.pendingAcquire) {
      return this.pendingAcquire
    }

    if (!this.dependencies.lockManager || !this.dependencies.generateUuid) {
      return unsupportedResult()
    }

    const attempt = ++this.attempt
    const acquisition = this.acquireOnce(attempt)
    this.pendingAcquire = acquisition
    this.pendingAttempt = attempt

    try {
      return await acquisition
    } finally {
      if (this.pendingAcquire === acquisition) {
        this.pendingAcquire = null
      }
      if (this.pendingAttempt === attempt) {
        this.pendingAttempt = null
      }
    }
  }

  release(): void {
    const activeLease = this.activeLease
    const releasableAttempt = activeLease?.attempt ?? this.pendingAttempt

    if (releasableAttempt === null || releasableAttempt !== this.attempt) {
      return
    }

    this.attempt += 1
    this.activeLease = null
    activeLease?.releaseLock()
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.release()
  }

  private acquireOnce(attempt: number): Promise<AuthDeviceLeaseResult> {
    const acquisition = createDeferred<AuthDeviceLeaseResult>()
    const lockManager = this.dependencies.lockManager

    if (!lockManager) {
      return Promise.resolve(unsupportedResult())
    }

    try {
      const lockRequest = lockManager.request(
        AUTH_OWNER_LOCK_NAME,
        { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
          if (!lock) {
            acquisition.resolve({
              status: 'busy',
              message: AUTH_OWNER_BUSY_MESSAGE,
            })
            return
          }

          if (this.disposed || attempt !== this.attempt) {
            acquisition.resolve(unsupportedResult())
            return
          }

          const deviceUuid = this.readOrCreateDeviceUuid()
          if (!deviceUuid) {
            acquisition.resolve(storageUnavailableResult())
            return
          }

          const lockLifetime = createDeferred<void>()
          this.activeLease = {
            attempt,
            deviceUuid,
            releaseLock: () => lockLifetime.resolve(undefined),
          }
          acquisition.resolve({ status: 'acquired', deviceUuid })

          await lockLifetime.promise

          if (this.activeLease?.attempt === attempt) {
            this.activeLease = null
          }
        },
      )

      void lockRequest.catch(() => {
        if (!acquisition.settled()) {
          acquisition.resolve(unsupportedResult())
        }

        if (this.activeLease?.attempt === attempt) {
          this.activeLease = null
        }
      })
    } catch {
      acquisition.resolve(unsupportedResult())
    }

    return acquisition.promise
  }

  private readOrCreateDeviceUuid(): string | null {
    try {
      const storedUuid = this.dependencies.storage.getItem(
        DEVICE_KEY_STORAGE_KEY,
      )
      if (storedUuid && isValidUuid(storedUuid)) {
        return storedUuid
      }

      const generatedUuid = this.dependencies.generateUuid?.()
      if (!generatedUuid || !isValidUuid(generatedUuid)) {
        return null
      }

      this.dependencies.storage.setItem(DEVICE_KEY_STORAGE_KEY, generatedUuid)
      return generatedUuid
    } catch {
      return null
    }
  }
}

function getBrowserLockManager(): AuthOwnerLockManager | null {
  if (
    typeof navigator === 'undefined' ||
    !navigator.locks ||
    typeof navigator.locks.request !== 'function'
  ) {
    return null
  }

  const browserLocks = navigator.locks

  return {
    request: (name, options, callback) =>
      browserLocks.request(name, options, (lock) => callback(lock)),
  }
}

function getBrowserUuidGenerator(): DeviceUuidGenerator | null {
  if (
    typeof crypto === 'undefined' ||
    typeof crypto.randomUUID !== 'function'
  ) {
    return null
  }

  return () => crypto.randomUUID()
}

const browserDeviceStorage: DeviceKeyStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
}

export function createBrowserAuthDeviceLease(): AuthDeviceLease {
  return new AuthDeviceLease({
    storage: browserDeviceStorage,
    lockManager: getBrowserLockManager(),
    generateUuid: getBrowserUuidGenerator(),
  })
}
