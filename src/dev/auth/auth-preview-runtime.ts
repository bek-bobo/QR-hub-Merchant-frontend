import type { LogoutFeedback } from '@/shared/auth/feedback'
import { safeAbortedError } from '@/shared/api/errors'
import type { AuthContextValue, AuthActions } from '@/shared/auth/useAuth'
import { LoginController, type LoginSnapshot } from '@/shared/auth/login-controller'
import {
  SessionController,
  type ProtectedOperation,
  type SessionCache,
  type SessionSnapshot,
} from '@/shared/auth/session-controller'
import {
  createAuthSimulator,
  type AuthPreviewScenario,
  type AuthSimulator,
  type AuthSimulatorSnapshot,
} from '@/dev/auth/auth-simulator'
import {
  createPreviewAuthDeviceLease,
  type PreviewAuthDeviceLease,
} from '@/dev/auth/preview-device-lease'

export interface AuthPreviewRuntimeSnapshot {
  readonly runtimeScenario: AuthPreviewScenario
  readonly login: LoginSnapshot
  readonly session: SessionSnapshot
  readonly simulator: AuthSimulatorSnapshot
  readonly protectedReadCalls: number
  readonly controlPending: boolean
  readonly leaseOwned: boolean
  readonly statusMessage: string | null
}

export interface AuthPreviewRuntime {
  readonly runtimeId: string
  getSnapshot(): AuthPreviewRuntimeSnapshot
  subscribe(listener: () => void): () => void
  getAuthContextValue(): AuthContextValue
  expireOtpNow(): void
  runParallelProtectedReads(): Promise<void>
  runLogoutDuringRefresh(): Promise<void>
  logout(): Promise<void>
  restartLogin(): void
  dispose(): Promise<void>
}

class PreviewClock {
  private value = 1_700_000_000_000

  now = (): number => this.value

  advanceTo(value: number): void {
    if (Number.isFinite(value) && value > this.value) {
      this.value = value
    }
  }

  approachAccessExpiry(): void {
    this.value += 45_000
  }
}

let nextRuntimeId = 0

class ControllerAuthPreviewRuntime implements AuthPreviewRuntime {
  readonly runtimeId: string
  private readonly scenario: AuthPreviewScenario
  private readonly simulator: AuthSimulator
  private readonly lease: PreviewAuthDeviceLease
  private readonly clock = new PreviewClock()
  private readonly login: LoginController
  private readonly session: SessionController
  private readonly listeners = new Set<() => void>()
  private readonly unsubscribeControllers: readonly (() => void)[]
  private readonly actions: AuthActions
  private snapshot: AuthPreviewRuntimeSnapshot
  private protectedReadCalls = 0
  private nextSessionScope = 0
  private controlPending = false
  private controlRevision = 0
  private statusMessage: string | null = null
  private logoutMessage: LogoutFeedback | null = null
  private disposed = false

  constructor(scenario: AuthPreviewScenario, cache: SessionCache) {
    nextRuntimeId += 1
    this.runtimeId = `preview-runtime-${nextRuntimeId}`
    this.scenario = scenario
    this.simulator = createAuthSimulator(scenario)
    this.lease = createPreviewAuthDeviceLease()
    this.session = new SessionController({
      api: this.simulator.api,
      cache,
      now: this.clock.now,
      generateScopeId: () =>
        `${this.runtimeId}-scope-${++this.nextSessionScope}`,
    })
    this.login = new LoginController({
      api: this.simulator.api,
      lease: this.lease,
      session: this.session,
      now: this.clock.now,
    })
    this.actions = {
      startLogin: (phone) => this.login.startLogin(phone),
      submitOtp: (otpCode) => this.login.submitOtp(otpCode),
      submitPin: (pin) => this.login.submitPin(pin),
      submitNewPin: (pin, confirmation) =>
        this.login.submitNewPin(pin, confirmation),
      startReset: () => this.login.startReset(),
      resendOtp: () => this.login.resendOtp(),
      restart: () => this.restartLogin(),
      getOtpRemainingMs: () => this.login.getOtpRemainingMs(),
      refreshProfile: () => this.refreshProfile(),
      logout: () => this.logout(),
    }
    this.snapshot = this.createSnapshot()
    this.unsubscribeControllers = [
      this.login.subscribe(this.handleControllerChange),
      this.session.subscribe(this.handleControllerChange),
      this.simulator.subscribe(this.emit),
    ]
  }

  getSnapshot = (): AuthPreviewRuntimeSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    if (this.disposed) {
      return () => undefined
    }
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getAuthContextValue(): AuthContextValue {
    const sessionSnapshot = this.snapshot.session
    const profile =
      sessionSnapshot.phase === 'authenticated'
        ? sessionSnapshot.profile
        : null

    return {
      source: 'demo',
      sessionPhase: sessionSnapshot.phase,
      sessionScopeId:
        sessionSnapshot.phase === 'authenticated'
          ? sessionSnapshot.sessionScopeId
          : null,
      profile,
      loginSnapshot: this.snapshot.login,
      pending: {
        login: this.snapshot.login.pending,
        profileRefresh: false,
        logout: this.snapshot.controlPending,
      },
      unavailable: this.snapshot.login.phase === 'unavailable',
      profileRefreshMessage: null,
      logoutMessage: this.logoutMessage,
      actions: this.actions,
    }
  }

  expireOtpNow(): void {
    const deadline = this.login.getSnapshot().otpDeadlineMs
    if (deadline === undefined) {
      this.setStatus('Avval OTP bosqichiga o‘ting.')
      return
    }

    this.clock.advanceTo(deadline + 1)
    this.simulator.markOtpExpired()
    this.setStatus('Synthetic OTP muddati tugatildi.')
  }

  async runParallelProtectedReads(): Promise<void> {
    if (!this.canRunProtectedControl()) {
      return
    }

    const revision = this.beginControl('Parallel so‘rovlar boshlandi…')
    this.clock.approachAccessExpiry()
    const first = this.session.protectedRead(this.protectedProbe)
    const second = this.session.protectedRead(this.protectedProbe)

    await this.simulator.waitForRefreshStart()
    if (!this.isCurrentControl(revision)) {
      return
    }

    this.simulator.settleRefresh()
    const results = await Promise.all([first, second])
    if (!this.isCurrentControl(revision)) {
      return
    }

    const safeResult = results.every((result) => result.status === 'success')
      ? 'Ikki himoyalangan so‘rov yakunlandi.'
      : this.session.getSnapshot().phase === 'anonymous'
        ? 'Refresh yakunlanmadi. Qayta kirish talab qilinadi.'
        : 'Himoyalangan so‘rovlarni yakunlab bo‘lmadi.'
    this.finishControl(revision, safeResult)
  }

  async runLogoutDuringRefresh(): Promise<void> {
    if (!this.canRunProtectedControl()) {
      return
    }

    const revision = this.beginControl('Refresh va chiqish race boshlandi…')
    this.clock.approachAccessExpiry()
    const protectedRead = this.session.protectedRead(this.protectedProbe)

    await this.simulator.waitForRefreshStart()
    if (!this.isCurrentControl(revision)) {
      return
    }

    const logout = this.session.logout()
    this.simulator.settleRefresh(true)
    await Promise.all([protectedRead, logout])
    if (!this.isCurrentControl(revision)) {
      return
    }

    this.login.restart()
    const isAnonymous = this.session.getSnapshot().phase === 'anonymous'
    this.finishControl(
      revision,
      isAnonymous
        ? 'Kechikkan refresh sessiyani qayta tiklamadi.'
        : 'Race holatini yakunlab bo‘lmadi.',
    )
  }

  async logout(): Promise<void> {
    if (this.disposed || this.controlPending) {
      return
    }

    const revision = this.beginControl('Chiqish bajarilmoqda…')
    const result = await this.session.logout()
    if (!this.isCurrentControl(revision)) {
      return
    }

    this.login.restart()
    this.logoutMessage = result.status === 'remote-confirmed' ? null : 'remoteUnconfirmed'
    this.finishControl(revision, result.status === 'remote-confirmed'
      ? 'Preview sessiyasidan chiqildi.'
      : 'Bu oynadan chiqildi. Synthetic sessiya yopilganini tasdiqlab bo‘lmadi.')
  }

  restartLogin(): void {
    if (this.disposed) {
      return
    }

    this.logoutMessage = null
    this.statusMessage = null
    this.login.restart()
    this.emit()
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.controlRevision += 1
    for (const unsubscribe of this.unsubscribeControllers) {
      unsubscribe()
    }
    this.login.dispose()
    const sessionDisposal = this.session.dispose()
    this.simulator.dispose()
    this.lease.dispose()
    this.listeners.clear()
    await sessionDisposal
  }

  private refreshProfile = async (): Promise<void> => {
    if (this.disposed || this.controlPending) {
      return
    }

    const result = await this.session.refreshProfile()
    if (result.status === 'failed') {
      this.setStatus('Profilni yangilab bo‘lmadi.')
    } else if (result.status === 'success') {
      this.setStatus('Synthetic profil qayta olindi.')
    }
  }

  private protectedProbe: ProtectedOperation<'safe-preview-result'> = async ({
    signal,
  }) => {
    if (signal.aborted || this.disposed) {
      throw safeAbortedError()
    }

    this.protectedReadCalls += 1
    this.emit()
    return 'safe-preview-result'
  }

  private canRunProtectedControl(): boolean {
    if (this.disposed || this.controlPending) {
      return false
    }

    if (this.session.getSnapshot().phase !== 'authenticated') {
      this.setStatus('Avval login va get-me bootstrapni qo‘lda yakunlang.')
      return false
    }

    return true
  }

  private beginControl(message: string): number {
    this.controlRevision += 1
    this.controlPending = true
    this.statusMessage = message
    this.emit()
    return this.controlRevision
  }

  private finishControl(revision: number, message: string): void {
    if (!this.isCurrentControl(revision)) {
      return
    }
    this.controlPending = false
    this.statusMessage = message
    this.emit()
  }

  private isCurrentControl(revision: number): boolean {
    return !this.disposed && revision === this.controlRevision
  }

  private handleControllerChange = (): void => {
    if (
      this.session.getSnapshot().phase === 'anonymous' &&
      this.login.getSnapshot().phase === 'complete'
    ) {
      this.login.restart()
      return
    }

    this.emit()
  }

  private setStatus(message: string): void {
    if (this.disposed) {
      return
    }
    this.statusMessage = message
    this.emit()
  }

  private emit = (): void => {
    if (this.disposed) {
      return
    }

    this.snapshot = this.createSnapshot()
    for (const listener of this.listeners) {
      try {
        listener()
      } catch {
        // One preview subscriber cannot block lifecycle cleanup.
      }
    }
  }

  private createSnapshot(): AuthPreviewRuntimeSnapshot {
    return Object.freeze({
      runtimeScenario: this.scenario,
      login: this.login.getSnapshot(),
      session: this.session.getSnapshot(),
      simulator: this.simulator.getSnapshot(),
      protectedReadCalls: this.protectedReadCalls,
      controlPending: this.controlPending,
      leaseOwned: this.lease.isOwned(),
      statusMessage: this.statusMessage,
    })
  }
}

export function createAuthPreviewRuntime(
  scenario: AuthPreviewScenario,
  cache: SessionCache,
): AuthPreviewRuntime {
  return new ControllerAuthPreviewRuntime(scenario, cache)
}
