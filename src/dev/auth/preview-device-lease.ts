import { AUTH_OWNER_BUSY_MESSAGE } from '@/shared/auth/device-lease'
import type { AuthDeviceLeaseResult } from '@/shared/auth/device-lease'
import type { LoginOwnerLease } from '@/shared/auth/login-controller'

export const PREVIEW_AUTH_OWNER_LOCK_NAME = 'qrhub:auth-preview-owner:v1'
export const PREVIEW_DEVICE_KEY_STORAGE_KEY = 'qrhub.preview-device-key.v1'

const previewUnsupportedMessage = 'browserUnsupported' as const
const previewStorageUnavailableMessage = 'deviceStorageUnavailable' as const
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly settled: () => boolean
}

interface ActivePreviewLease {
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

function unsupportedResult(): AuthDeviceLeaseResult {
  return { status: 'unsupported', message: previewUnsupportedMessage }
}

function storageUnavailableResult(): AuthDeviceLeaseResult {
  return {
    status: 'storage-unavailable',
    message: previewStorageUnavailableMessage,
  }
}

export class PreviewAuthDeviceLease implements LoginOwnerLease {
  private attempt = 0
  private activeLease: ActivePreviewLease | null = null
  private pendingAcquire: Promise<AuthDeviceLeaseResult> | null = null
  private pendingAttempt: number | null = null
  private disposed = false

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

    if (
      typeof navigator === 'undefined' ||
      !navigator.locks ||
      typeof navigator.locks.request !== 'function' ||
      typeof crypto === 'undefined' ||
      typeof crypto.randomUUID !== 'function'
    ) {
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

  isOwned(): boolean {
    return this.activeLease !== null
  }

  private acquireOnce(attempt: number): Promise<AuthDeviceLeaseResult> {
    const acquisition = createDeferred<AuthDeviceLeaseResult>()
    const browserLocks = navigator.locks

    try {
      const lockRequest = browserLocks.request(
        PREVIEW_AUTH_OWNER_LOCK_NAME,
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
      const storedUuid = window.localStorage.getItem(
        PREVIEW_DEVICE_KEY_STORAGE_KEY,
      )
      if (storedUuid && uuidPattern.test(storedUuid)) {
        return storedUuid
      }

      const generatedUuid = crypto.randomUUID()
      if (!uuidPattern.test(generatedUuid)) {
        return null
      }

      window.localStorage.setItem(
        PREVIEW_DEVICE_KEY_STORAGE_KEY,
        generatedUuid,
      )
      return generatedUuid
    } catch {
      return null
    }
  }
}

export function createPreviewAuthDeviceLease(): PreviewAuthDeviceLease {
  return new PreviewAuthDeviceLease()
}
