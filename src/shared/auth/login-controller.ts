import type { LoginFeedback } from './feedback'
import type { AuthApi } from '@/shared/api/auth-api'
import { normalizeUnknownError } from '@/shared/api/errors'
import type { AuthDeviceLeaseResult } from '@/shared/auth/device-lease'
import type { EstablishSessionResult } from '@/shared/auth/session-controller'
import type { StageReply, TokenPair } from '@/shared/auth/model'
import {
  isValidOtp,
  isValidPin,
  normalizePhone,
} from '@/features/auth/validation'

export type LoginFlow = 'login' | 'reset'

export type LoginPhase =
  | 'phone'
  | 'otp'
  | 'pin'
  | 'set-pin'
  | 'reset-otp'
  | 'completing'
  | 'complete'
  | 'error'
  | 'expired'
  | 'blocked'
  | 'unavailable'

export interface LoginSnapshot {
  readonly phase: LoginPhase
  readonly flow: LoginFlow
  readonly pending: boolean
  readonly phone?: string
  readonly otpDeadlineMs?: number
  readonly message?: LoginFeedback
}

export interface LoginOwnerLease {
  acquire(): Promise<AuthDeviceLeaseResult>
  release(): void
}

export interface LoginSessionPort {
  establishSession(
    tokenPair: TokenPair,
    ownedLease: LoginOwnerLease,
  ): Promise<EstablishSessionResult>
}

export interface LoginControllerDependencies {
  readonly api: AuthApi | null
  readonly lease: LoginOwnerLease
  readonly session: LoginSessionPort
  readonly now: () => number
}

interface Command {
  readonly revision: number
  readonly controller: AbortController
}



const initialPhoneSnapshot: LoginSnapshot = Object.freeze({
  phase: 'phone',
  flow: 'login',
  pending: false,
})

function hasOtpMetadata(
  reply: StageReply,
): reply is StageReply & { readonly otpId: string; readonly expiresInSeconds: number } {
  return (
    typeof reply.otpId === 'string' &&
    reply.otpId.length > 0 &&
    typeof reply.expiresInSeconds === 'number' &&
    Number.isFinite(reply.expiresInSeconds) &&
    reply.expiresInSeconds > 0
  )
}

function isNonEmpty(value: string): boolean {
  return value.length > 0
}

export class LoginController {
  private readonly dependencies: LoginControllerDependencies
  private readonly listeners = new Set<() => void>()
  private snapshot: LoginSnapshot
  private sessionKey: string | null = null
  private otpId: string | null = null
  private otpDeadlineMs: number | null = null
  private phone: string | null = null
  private flow: LoginFlow = 'login'
  private flowRevision = 0
  private currentCommand: Command | null = null
  private ownsLease = false
  private disposed = false

  constructor(dependencies: LoginControllerDependencies) {
    this.dependencies = dependencies
    this.snapshot = dependencies.api
      ? initialPhoneSnapshot
      : Object.freeze({
          phase: 'unavailable',
          flow: 'login',
          pending: false,
          message: 'unavailable',
        })
  }

  getSnapshot = (): LoginSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    if (this.disposed) {
      return () => undefined
    }

    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getOtpRemainingMs(): number {
    if (this.otpDeadlineMs === null) {
      return 0
    }

    try {
      const now = this.dependencies.now()
      return Number.isFinite(now)
        ? Math.max(0, this.otpDeadlineMs - now)
        : 0
    } catch {
      return 0
    }
  }

  reportRestoreLeaseFailure(message: LoginFeedback): void {
    if (!this.disposed && this.snapshot.phase === 'phone') this.setUnavailable(message)
  }

  async startLogin(phoneInput: string): Promise<void> {
    const api = this.dependencies.api
    if (!api) {
      this.setUnavailable('unavailable')
      return
    }

    if (this.snapshot.phase !== 'phone') {
      return
    }

    const phone = normalizePhone(phoneInput)
    if (!phone) {
      this.setSnapshot({
        phase: 'phone',
        flow: 'login',
        pending: false,
        message: 'invalidPhone',
      })
      return
    }

    const command = this.beginCommand()
    if (!command) {
      return
    }

    try {
      const acquisition = await this.dependencies.lease.acquire()
      if (!this.isCurrent(command)) {
        if (acquisition.status === 'acquired') {
          this.dependencies.lease.release()
        }
        return
      }

      if (acquisition.status !== 'acquired') {
        this.setUnavailable(acquisition.message)
        return
      }

      this.ownsLease = true
      const created = await api.createSession(acquisition.deviceUuid, {
        signal: command.controller.signal,
      })
      if (!this.isCurrent(command)) {
        return
      }

      if (
        !isNonEmpty(created.sessionKey) ||
        created.reply.stage !== 'otp' ||
        created.reply.tokenPair
      ) {
        this.failTerminal('error', 'contract')
        return
      }

      this.sessionKey = created.sessionKey
      this.phone = phone
      this.flow = 'login'

      const reply = await api.sendOtp(created.sessionKey, phone, {
        signal: command.controller.signal,
      })
      if (!this.isCurrent(command)) {
        return
      }

      if (!this.applyLoginSendReply(reply)) {
        this.failTerminal('error', 'contract')
      }
    } catch (error) {
      this.handleCommandError(command, error)
    } finally {
      this.finishCommand(command)
    }
  }

  async submitOtp(otpCode: string): Promise<void> {
    if (
      this.snapshot.phase !== 'otp' &&
      this.snapshot.phase !== 'reset-otp'
    ) {
      return
    }

    if (!isValidOtp(otpCode)) {
      this.setStageMessage('invalidOtp')
      return
    }

    if (this.getOtpRemainingMs() === 0) {
      this.setStageMessage('otpExpired')
      return
    }

    const api = this.dependencies.api
    const sessionKey = this.sessionKey
    const otpId = this.otpId
    if (!api || !sessionKey || !otpId) {
      this.failTerminal('error', 'contract')
      return
    }

    const command = this.beginCommand()
    if (!command) {
      return
    }

    try {
      const reply =
        this.flow === 'reset'
          ? await api.resetVerifyOtp(
              sessionKey,
              { otpId, otpCode },
              { signal: command.controller.signal },
            )
          : await api.verifyOtp(
              sessionKey,
              { otpId, otpCode },
              { signal: command.controller.signal },
            )

      if (!this.isCurrent(command)) {
        return
      }

      const nextPhase: 'set-pin' | 'pin' | null =
        this.flow === 'reset'
          ? reply.stage === 'set-pin'
            ? 'set-pin'
            : null
          : reply.stage === 'set-pin' || reply.stage === 'pin'
            ? reply.stage
            : null
      if (!nextPhase || reply.tokenPair) {
        this.failTerminal('error', 'contract')
        return
      }

      this.clearOtpState()
      this.setSnapshot({
        phase: nextPhase,
        flow: this.flow,
        pending: true,
        phone: this.phone ?? undefined,
      })
    } catch (error) {
      this.handleCommandError(command, error)
    } finally {
      this.finishCommand(command)
    }
  }

  async submitPin(pin: string): Promise<void> {
    if (this.snapshot.phase !== 'pin') {
      return
    }

    if (!isValidPin(pin)) {
      this.setStageMessage('invalidPin')
      return
    }

    const api = this.dependencies.api
    const sessionKey = this.sessionKey
    if (!api || !sessionKey || !this.ownsLease) {
      this.failTerminal('error', 'contract')
      return
    }

    const command = this.beginCommand()
    if (!command) {
      return
    }

    try {
      const reply = await api.checkPin(sessionKey, pin, {
        signal: command.controller.signal,
      })
      if (!this.isCurrent(command)) {
        return
      }

      if (reply.stage !== 'done' || !reply.tokenPair) {
        this.failTerminal('error', 'contract')
        return
      }

      await this.transferAuthenticatedSession(command, reply.tokenPair)
    } catch (error) {
      this.handleCommandError(command, error)
    } finally {
      this.finishCommand(command)
    }
  }

  async submitNewPin(pin: string, confirmation: string): Promise<void> {
    if (this.snapshot.phase !== 'set-pin') {
      return
    }

    if (!isValidPin(pin) || !isValidPin(confirmation)) {
      this.setStageMessage('invalidPin')
      return
    }

    if (pin !== confirmation) {
      this.setStageMessage('pinMismatch')
      return
    }

    const api = this.dependencies.api
    const sessionKey = this.sessionKey
    if (!api || !sessionKey) {
      this.failTerminal('error', 'contract')
      return
    }

    const command = this.beginCommand()
    if (!command) {
      return
    }

    try {
      const reply =
        this.flow === 'reset'
          ? await api.resetSetPin(sessionKey, pin, {
              signal: command.controller.signal,
            })
          : await api.setPin(sessionKey, pin, {
              signal: command.controller.signal,
            })

      if (!this.isCurrent(command)) {
        return
      }

      if (reply.stage !== 'pin' || reply.tokenPair) {
        this.failTerminal('error', 'contract')
        return
      }

      this.flow = 'login'
      this.setSnapshot({
        phase: 'pin',
        flow: 'login',
        pending: true,
        phone: this.phone ?? undefined,
      })
    } catch (error) {
      this.handleCommandError(command, error)
    } finally {
      this.finishCommand(command)
    }
  }

  async startReset(): Promise<void> {
    if (
      this.snapshot.phase !== 'pin' ||
      !this.phone ||
      this.currentCommand
    ) {
      return
    }

    const api = this.dependencies.api
    const sessionKey = this.sessionKey
    if (!api || !sessionKey) {
      this.failTerminal('error', 'contract')
      return
    }

    this.invalidatePendingCommand()
    this.flow = 'reset'
    const command = this.beginCommand()
    if (!command) {
      return
    }

    try {
      const reply = await api.resetSendOtp(sessionKey, this.phone, {
        signal: command.controller.signal,
      })
      if (!this.isCurrent(command)) {
        return
      }

      if (!this.applyOtpReply(reply, 'reset-otp')) {
        this.failTerminal('error', 'contract')
      }
    } catch (error) {
      this.handleCommandError(command, error)
    } finally {
      this.finishCommand(command)
    }
  }

  async resendOtp(): Promise<void> {
    if (
      this.snapshot.phase !== 'otp' &&
      this.snapshot.phase !== 'reset-otp'
    ) {
      return
    }

    if (this.getOtpRemainingMs() > 0) {
      this.setStageMessage('otpNotExpired')
      return
    }

    const api = this.dependencies.api
    const sessionKey = this.sessionKey
    if (!api || !sessionKey) {
      this.failTerminal('error', 'contract')
      return
    }

    const command = this.beginCommand()
    if (!command) {
      return
    }

    try {
      const reply =
        this.flow === 'reset'
          ? await api.resetResendOtp(sessionKey, {
              signal: command.controller.signal,
            })
          : await api.resendOtp(sessionKey, {
              signal: command.controller.signal,
            })

      if (!this.isCurrent(command)) {
        return
      }

      const expectedPhase = this.flow === 'reset' ? 'reset-otp' : 'otp'
      if (!this.applyOtpReply(reply, expectedPhase)) {
        this.failTerminal('error', 'contract')
      }
    } catch (error) {
      this.handleCommandError(command, error)
    } finally {
      this.finishCommand(command)
    }
  }

  restart(): void {
    if (this.disposed) {
      return
    }

    this.invalidatePendingCommand()
    this.clearPrivateFlowState()
    this.releaseOwnedLease()
    this.flow = 'login'
    this.setSnapshot(
      this.dependencies.api
        ? initialPhoneSnapshot
        : {
            phase: 'unavailable',
            flow: 'login',
            pending: false,
            message: 'unavailable',
          },
    )
  }

  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.invalidatePendingCommand()
    this.clearPrivateFlowState()
    this.releaseOwnedLease()
    this.listeners.clear()
  }

  private beginCommand(): Command | null {
    if (this.disposed || this.currentCommand) {
      return null
    }

    const command = {
      revision: this.flowRevision,
      controller: new AbortController(),
    }
    this.currentCommand = command
    this.setSnapshot({ ...this.snapshot, pending: true, message: undefined })
    return command
  }

  private finishCommand(command: Command): void {
    if (!this.isCurrent(command)) {
      return
    }

    this.currentCommand = null
    this.setSnapshot({ ...this.snapshot, pending: false })
  }

  private isCurrent(command: Command): boolean {
    return (
      !this.disposed &&
      this.currentCommand === command &&
      this.flowRevision === command.revision
    )
  }

  private invalidatePendingCommand(): void {
    this.flowRevision += 1
    this.currentCommand?.controller.abort()
    this.currentCommand = null
  }

  private applyLoginSendReply(reply: StageReply): boolean {
    if (reply.tokenPair) {
      return false
    }

    if (reply.stage === 'pin') {
      this.clearOtpState()
      this.setSnapshot({
        phase: 'pin',
        flow: 'login',
        pending: true,
        phone: this.phone ?? undefined,
      })
      return true
    }

    return this.applyOtpReply(reply, 'otp')
  }

  private applyOtpReply(
    reply: StageReply,
    expectedPhase: 'otp' | 'reset-otp',
  ): boolean {
    if (reply.stage !== expectedPhase || reply.tokenPair || !hasOtpMetadata(reply)) {
      return false
    }

    const deadline = this.createOtpDeadline(reply.expiresInSeconds)
    if (deadline === null) {
      return false
    }

    this.otpId = reply.otpId
    this.otpDeadlineMs = deadline
    this.setSnapshot({
      phase: expectedPhase,
      flow: this.flow,
      pending: true,
      phone: this.phone ?? undefined,
      otpDeadlineMs: deadline,
    })
    return true
  }

  private createOtpDeadline(expiresInSeconds: number): number | null {
    try {
      const now = this.dependencies.now()
      const deadline = now + expiresInSeconds * 1_000
      return Number.isFinite(now) && Number.isFinite(deadline) ? deadline : null
    } catch {
      return null
    }
  }

  private async transferAuthenticatedSession(
    command: Command,
    tokenPair: TokenPair,
  ): Promise<void> {
    const phone = this.phone
    this.ownsLease = false
    this.clearPrivateFlowState()
    this.flowRevision += 1
    this.currentCommand = null
    const transferRevision = this.flowRevision
    this.setSnapshot({
      phase: 'completing',
      flow: 'login',
      pending: true,
      phone: phone ?? undefined,
      message: 'completing',
    })

    let result: EstablishSessionResult
    try {
      result = await this.dependencies.session.establishSession(
        tokenPair,
        this.dependencies.lease,
      )
    } catch {
      if (!this.disposed && this.flowRevision === transferRevision) {
        this.setSnapshot({
          phase: 'error',
          flow: 'login',
          pending: false,
          phone: phone ?? undefined,
          message: 'request',
        })
      }
      command.controller.abort()
      return
    }
    if (this.disposed || this.flowRevision !== transferRevision) {
      return
    }

    if (result.status === 'authenticated') {
      this.setSnapshot({
        phase: 'complete',
        flow: 'login',
        pending: false,
        phone: phone ?? undefined,
        message: 'complete',
      })
      return
    }

    const message =
      result.status === 'access-denied' ? 'contract' : 'request'
    this.setSnapshot({
      phase: 'error',
      flow: 'login',
      pending: false,
      phone: phone ?? undefined,
      message,
    })

    command.controller.abort()
  }

  private handleCommandError(command: Command, error: unknown): void {
    if (!this.isCurrent(command)) {
      return
    }

    const safeError = normalizeUnknownError(error)
    if (safeError.tag === 'OTP_CODE_INVALID') {
      this.setStageMessage('wrongOtp')
      return
    }

    if (safeError.tag === 'PIN_INVALID') {
      this.setStageMessage('wrongPin')
      return
    }

    if (safeError.tag === 'OTP_EXPIRED') {
      this.failTerminal('expired', 'sessionExpired')
      return
    }

    if (safeError.tag === 'OTP_NOT_EXPIRED_YET') {
      this.setStageMessage('otpNotExpired')
      return
    }

    if (
      safeError.tag === 'DEVICE_BLOCKED' ||
      safeError.tag === 'PIN_MAX_ATTEMPTS_EXCEEDED'
    ) {
      this.failTerminal('blocked', 'blocked')
      return
    }

    if (
      safeError.tag === 'SESSION_EXPIRED' ||
      safeError.tag === 'OTP_MAX_ATTEMPTS_EXCEEDED'
    ) {
      this.failTerminal('expired', 'sessionExpired')
      return
    }

    if (safeError.tag === 'RATE_LIMIT_EXCEEDED') {
      this.failTerminal('error', 'rateLimited')
      return
    }

    this.failTerminal(
      'error',
      safeError.kind === 'contract' ? 'contract' : 'request',
    )
  }

  private setStageMessage(message: LoginFeedback): void {
    this.setSnapshot({ ...this.snapshot, message })
  }

  private setUnavailable(message: LoginFeedback): void {
    this.invalidatePendingCommand()
    this.clearPrivateFlowState()
    this.releaseOwnedLease()
    this.setSnapshot({
      phase: 'unavailable',
      flow: this.flow,
      pending: false,
      message,
    })
  }

  private failTerminal(
    phase: 'error' | 'expired' | 'blocked',
    message: LoginFeedback,
  ): void {
    const phone = this.phone
    this.invalidatePendingCommand()
    this.clearPrivateFlowState()
    this.releaseOwnedLease()
    this.setSnapshot({
      phase,
      flow: this.flow,
      pending: false,
      phone: phone ?? undefined,
      message,
    })
  }

  private clearOtpState(): void {
    this.otpId = null
    this.otpDeadlineMs = null
  }

  private clearPrivateFlowState(): void {
    this.sessionKey = null
    this.clearOtpState()
    this.phone = null
  }

  private releaseOwnedLease(): void {
    if (!this.ownsLease) {
      return
    }

    this.ownsLease = false
    try {
      this.dependencies.lease.release()
    } catch {
      // Lease adapter errors never expose private login state.
    }
  }

  private setSnapshot(snapshot: LoginSnapshot): void {
    this.snapshot = Object.freeze(snapshot)
    for (const listener of this.listeners) {
      try {
        listener()
      } catch {
        // One subscriber cannot block login lifecycle cleanup.
      }
    }
  }
}
