import type { AuthApi } from '@/shared/api/auth-api'
import {
  safeAbortedError,
  safeBusinessError,
  safeContractError,
  safeHttpError,
  safeNetworkError,
} from '@/shared/api/errors'
import type {
  AuthStage,
  CreatedAuthSession,
  Profile,
  RequestOptions,
  StageReply,
  TokenPair,
} from '@/shared/auth/model'

export const AUTH_DEMO_ONLY_MARKER = 'AUTH-DEMO-ONLY'

export type AuthPreviewScenario =
  | 'first-login'
  | 'existing-pin'
  | 'known-device'
  | 'reset-pin'
  | 'wrong-otp'
  | 'wrong-pin'
  | 'otp-expired'
  | 'device-blocked'
  | 'unknown-stage'
  | 'profile-403'
  | 'refresh-success'
  | 'refresh-failure'

export interface AuthSimulatorSnapshot {
  readonly simulatorScenario: AuthPreviewScenario
  readonly lastSimulatorMethod: 'none' | 'createSession' | 'sendOtp'
  readonly lastReturnedNormalizedStage: AuthStage | null
  readonly refreshCalls: number
  readonly getMeCalls: number
  readonly logoutCalls: number
  readonly refreshPending: boolean
}

export interface AuthSimulator {
  readonly api: AuthApi
  getSnapshot(): AuthSimulatorSnapshot
  subscribe(listener: () => void): () => void
  markOtpExpired(): void
  waitForRefreshStart(): Promise<void>
  settleRefresh(forceSuccess?: boolean): void
  dispose(): void
}

type OtpExpiredLifecycle =
  | 'active'
  | 'expired-awaiting-resend'
  | 'resent-active'

interface OtpVerificationRequest {
  readonly otpId: string
  readonly otpCode: string
}

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (reason: unknown) => void
}

interface PendingRefresh {
  readonly deferred: Deferred<TokenPair>
}

const previewSessionKey = 'preview-session-opaque'
const previewPhone = '998901234567'
const previewOtpTtlSeconds = 60

const previewProfile: Profile = Object.freeze({
  userId: 'preview-user',
  phone: previewPhone,
  fullname: 'Synthetic Merchant',
  roles: Object.freeze(['preview-role']),
  permissions: Object.freeze(['preview.profile']),
})

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => undefined
  let rejectPromise: (reason: unknown) => void = () => undefined
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  }
}

class InMemoryAuthSimulator implements AuthSimulator {
  readonly api: AuthApi
  private readonly scenario: AuthPreviewScenario
  private readonly listeners = new Set<() => void>()
  private snapshot: AuthSimulatorSnapshot
  private refreshStart = createDeferred<void>()
  private pendingRefresh: PendingRefresh | null = null
  private tokenRevision = 0
  private otpRevision = 0
  private currentOtpId: string | null = null
  private otpExpiredLifecycle: OtpExpiredLifecycle | null = null
  private wrongOtpReturned = false
  private wrongPinReturned = false
  private disposed = false

  constructor(scenario: AuthPreviewScenario) {
    this.scenario = scenario
    this.snapshot = Object.freeze({
      simulatorScenario: scenario,
      lastSimulatorMethod: 'none',
      lastReturnedNormalizedStage: null,
      refreshCalls: 0,
      getMeCalls: 0,
      logoutCalls: 0,
      refreshPending: false,
    })
    this.api = {
      createSession: (_deviceKey, options) => this.createSession(options),
      sendOtp: (_sessionKey, _phone, options) => this.sendOtp(options),
      resendOtp: (_sessionKey, options) => this.resendOtp(options),
      verifyOtp: (_sessionKey, request, options) =>
        this.verifyOtp(request, options),
      checkPin: (_sessionKey, _pin, options) => this.checkPin(options),
      setPin: (_sessionKey, _pin, options) => this.setPin(options),
      resetSendOtp: (_sessionKey, _phone, options) =>
        this.resetSendOtp(options),
      resetResendOtp: (_sessionKey, options) =>
        this.resetResendOtp(options),
      resetVerifyOtp: (_sessionKey, _request, options) =>
        this.resetVerifyOtp(options),
      resetSetPin: (_sessionKey, _pin, options) =>
        this.resetSetPin(options),
      refresh: (_refreshToken, options) => this.refresh(options),
      getMe: (_accessToken, options) => this.getMe(options),
      logout: (_accessToken, options) => this.logout(options),
    }
  }

  getSnapshot = (): AuthSimulatorSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    if (this.disposed) {
      return () => undefined
    }
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  markOtpExpired(): void {
    if (
      !this.disposed &&
      this.scenario === 'otp-expired' &&
      (this.otpExpiredLifecycle === 'active' ||
        this.otpExpiredLifecycle === 'resent-active')
    ) {
      this.otpExpiredLifecycle = 'expired-awaiting-resend'
    }
  }

  waitForRefreshStart(): Promise<void> {
    return this.pendingRefresh
      ? Promise.resolve()
      : this.refreshStart.promise
  }

  settleRefresh(forceSuccess = false): void {
    const pending = this.pendingRefresh
    if (!pending) {
      return
    }

    this.pendingRefresh = null
    this.refreshStart = createDeferred<void>()
    this.setSnapshot({
      ...this.snapshot,
      refreshPending: false,
    })

    if (this.scenario === 'refresh-failure' && !forceSuccess) {
      pending.deferred.reject(safeNetworkError())
      return
    }

    pending.deferred.resolve(this.createTokenPair())
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.refreshStart.resolve(undefined)
    this.pendingRefresh?.deferred.reject(safeAbortedError())
    this.pendingRefresh = null
    this.listeners.clear()
  }

  private async createSession(
    options?: RequestOptions,
  ): Promise<CreatedAuthSession> {
    this.assertAvailable(options)
    const reply: StageReply = { stage: 'otp' }
    this.recordStage('createSession', reply)
    return {
      sessionKey: previewSessionKey,
      reply,
    }
  }

  private async sendOtp(options?: RequestOptions): Promise<StageReply> {
    this.assertAvailable(options)

    if (this.scenario === 'unknown-stage') {
      return this.recordStage('sendOtp', { stage: 'done' })
    }

    if (
      this.scenario === 'known-device' ||
      this.scenario === 'reset-pin' ||
      this.scenario === 'device-blocked'
    ) {
      return this.recordStage('sendOtp', { stage: 'pin' })
    }

    return this.recordStage(
      'sendOtp',
      this.createOtpReply(
        'otp',
        this.scenario === 'otp-expired' ? 'active' : undefined,
      ),
    )
  }

  private async resendOtp(options?: RequestOptions): Promise<StageReply> {
    this.assertAvailable(options)

    if (this.scenario === 'otp-expired') {
      if (this.otpExpiredLifecycle !== 'expired-awaiting-resend') {
        throw safeContractError()
      }

      return this.createOtpReply('otp', 'resent-active')
    }

    return this.createOtpReply('otp')
  }

  private async verifyOtp(
    request: OtpVerificationRequest,
    options?: RequestOptions,
  ): Promise<StageReply> {
    this.assertAvailable(options)

    if (this.scenario === 'wrong-otp' && !this.wrongOtpReturned) {
      this.wrongOtpReturned = true
      throw safeBusinessError({ tag: 'OTP_CODE_INVALID' })
    }

    if (this.scenario === 'otp-expired') {
      if (
        request.otpId !== this.currentOtpId ||
        this.otpExpiredLifecycle === 'expired-awaiting-resend'
      ) {
        throw safeBusinessError({ tag: 'OTP_EXPIRED' })
      }

      if (
        this.otpExpiredLifecycle === 'active' ||
        this.otpExpiredLifecycle === 'resent-active'
      ) {
        return { stage: 'pin', phone: previewPhone }
      }

      throw safeContractError()
    }

    return {
      stage: this.scenario === 'first-login' ? 'set-pin' : 'pin',
      phone: previewPhone,
    }
  }

  private async checkPin(options?: RequestOptions): Promise<StageReply> {
    this.assertAvailable(options)

    if (this.scenario === 'device-blocked') {
      throw safeBusinessError({ tag: 'DEVICE_BLOCKED' })
    }

    if (this.scenario === 'wrong-pin' && !this.wrongPinReturned) {
      this.wrongPinReturned = true
      throw safeBusinessError({ tag: 'PIN_INVALID' })
    }

    return { stage: 'done', tokenPair: this.createTokenPair() }
  }

  private async setPin(options?: RequestOptions): Promise<StageReply> {
    this.assertAvailable(options)
    return { stage: 'pin' }
  }

  private async resetSendOtp(
    options?: RequestOptions,
  ): Promise<StageReply> {
    this.assertAvailable(options)
    return this.createOtpReply('reset-otp')
  }

  private async resetResendOtp(
    options?: RequestOptions,
  ): Promise<StageReply> {
    this.assertAvailable(options)
    return this.createOtpReply('reset-otp')
  }

  private async resetVerifyOtp(
    options?: RequestOptions,
  ): Promise<StageReply> {
    this.assertAvailable(options)
    return { stage: 'set-pin', phone: previewPhone }
  }

  private async resetSetPin(options?: RequestOptions): Promise<StageReply> {
    this.assertAvailable(options)
    return { stage: 'pin' }
  }

  private refresh(options?: RequestOptions): Promise<TokenPair> {
    this.assertAvailable(options)

    if (this.pendingRefresh) {
      return this.pendingRefresh.deferred.promise
    }

    const deferred = createDeferred<TokenPair>()
    this.pendingRefresh = { deferred }
    this.setSnapshot({
      ...this.snapshot,
      refreshCalls: this.snapshot.refreshCalls + 1,
      refreshPending: true,
    })
    this.refreshStart.resolve(undefined)

    // Deliberately controlled: logout can win before a late response settles.
    return deferred.promise
  }

  private async getMe(options?: RequestOptions): Promise<Profile> {
    this.assertAvailable(options)
    this.setSnapshot({
      ...this.snapshot,
      getMeCalls: this.snapshot.getMeCalls + 1,
    })

    if (this.scenario === 'profile-403') {
      throw safeHttpError(403)
    }

    return previewProfile
  }

  private async logout(options?: RequestOptions): Promise<void> {
    this.assertAvailable(options)
    this.setSnapshot({
      ...this.snapshot,
      logoutCalls: this.snapshot.logoutCalls + 1,
    })
  }

  private createTokenPair(): TokenPair {
    this.tokenRevision += 1
    return Object.freeze({
      accessToken: `preview-access-${this.tokenRevision}`,
      refreshToken: `preview-refresh-${this.tokenRevision}`,
      accessTokenTtlMinutes: 1,
      refreshTokenTtlDays: 1,
    })
  }

  private createOtpReply(
    stage: 'otp' | 'reset-otp',
    lifecycle?: OtpExpiredLifecycle,
  ): StageReply {
    this.otpRevision += 1
    const otpId = `preview-otp-opaque-${this.otpRevision}`
    this.currentOtpId = otpId
    if (lifecycle) {
      this.otpExpiredLifecycle = lifecycle
    }
    return {
      stage,
      otpId,
      expiresInSeconds: previewOtpTtlSeconds,
    }
  }

  private recordStage(
    method: 'createSession' | 'sendOtp',
    reply: StageReply,
  ): StageReply {
    this.setSnapshot({
      ...this.snapshot,
      lastSimulatorMethod: method,
      lastReturnedNormalizedStage: reply.stage,
    })
    return reply
  }

  private assertAvailable(options?: RequestOptions): void {
    if (this.disposed || options?.signal?.aborted) {
      throw safeAbortedError()
    }
  }

  private setSnapshot(snapshot: AuthSimulatorSnapshot): void {
    if (this.disposed) {
      return
    }

    this.snapshot = Object.freeze(snapshot)
    for (const listener of this.listeners) {
      try {
        listener()
      } catch {
        // One preview observer cannot disrupt simulator cleanup.
      }
    }
  }
}

export function createAuthSimulator(
  scenario: AuthPreviewScenario,
): AuthSimulator {
  return new InMemoryAuthSimulator(scenario)
}
