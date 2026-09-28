import {
  normalizeUnknownError,
  type SafeApiError,
} from '@/shared/api/errors'
import type { AuthApi } from '@/shared/api/auth-api'
import type { Profile, TokenPair } from '@/shared/auth/model'

export const defaultRefreshThresholdMs = 30_000

export interface SessionCache {
  cancel(): Promise<void> | void
  clear(): void
}

export interface AdoptedAuthOwnerLease {
  release(): void
}

export interface ProtectedOperationContext {
  readonly accessToken: string
  readonly signal: AbortSignal
}

export type ProtectedOperation<T> = (
  context: ProtectedOperationContext,
) => Promise<T>

export type RefreshFailureClassifier = (error: SafeApiError) => boolean

export interface SessionControllerDependencies {
  readonly api: AuthApi
  readonly cache: SessionCache
  readonly now: () => number
  readonly generateScopeId: () => string
  readonly isRefreshableAuthFailure?: RefreshFailureClassifier
  readonly refreshThresholdMs?: number
}

export type SessionSnapshot =
  | { readonly phase: 'anonymous' }
  | { readonly phase: 'bootstrapping' }
  | {
      readonly phase: 'authenticated'
      readonly profile: Profile
      readonly sessionScopeId: string
    }
  | { readonly phase: 'bootstrap-error' }
  | { readonly phase: 'access-denied' }
  | { readonly phase: 'terminating' }

export type EstablishSessionResult =
  | {
      readonly status: 'authenticated'
      readonly profile: Profile
      readonly sessionScopeId: string
    }
  | { readonly status: 'access-denied' }
  | { readonly status: 'bootstrap-error' }
  | { readonly status: 'stale' }

export type FreshSessionResult =
  | { readonly status: 'fresh' }
  | { readonly status: 'anonymous' }
  | { readonly status: 'terminal'; readonly reason: 'refresh-failed' }
  | { readonly status: 'stale' }

export type ProtectedOperationResult<T> =
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'anonymous' }
  | { readonly status: 'access-denied' }
  | { readonly status: 'failed' }
  | { readonly status: 'session-ended' }

export type LogoutResult =
  | { readonly status: 'remote-confirmed' }
  | { readonly status: 'local-cleared-remote-unconfirmed' }

export type RefreshProfileResult =
  | {
      readonly status: 'success'
      readonly profile: Profile
      readonly changed: boolean
    }
  | { readonly status: 'access-denied' }
  | { readonly status: 'failed' }
  | { readonly status: 'session-ended' }

interface TokenState {
  readonly pair: Readonly<TokenPair>
  readonly accessDeadlineMs: number
  readonly revision: number
}

interface RefreshFlight {
  readonly epoch: number
  readonly revision: number
  readonly promise: Promise<FreshSessionResult>
}

interface OperationFailure {
  readonly kind: 'failure'
  readonly error: SafeApiError
  readonly epoch: number
  readonly revision: number
}

interface OperationSuccess<T> {
  readonly kind: 'success'
  readonly data: T
  readonly epoch: number
  readonly revision: number
}

type OperationAttempt<T> = OperationFailure | OperationSuccess<T>

const anonymousSnapshot: SessionSnapshot = Object.freeze({
  phase: 'anonymous',
})

function defaultRefreshFailureClassifier(error: SafeApiError): boolean {
  return error.kind === 'http' && error.status === 401
}

function isHttpStatus(error: SafeApiError, status: number): boolean {
  return error.kind === 'http' && error.status === status
}

function copyProfile(profile: Profile): Profile | null {
  if (
    typeof profile !== 'object' ||
    profile === null ||
    typeof profile.userId !== 'string' ||
    profile.userId.length === 0 ||
    typeof profile.phone !== 'string' ||
    (profile.fullname !== null && typeof profile.fullname !== 'string') ||
    !Array.isArray(profile.roles) ||
    !profile.roles.every((role) => typeof role === 'string') ||
    !Array.isArray(profile.permissions) ||
    !profile.permissions.every((permission) => typeof permission === 'string')
  ) {
    return null
  }

  return Object.freeze({
    userId: profile.userId,
    phone: profile.phone,
    fullname: profile.fullname,
    roles: Object.freeze([...profile.roles]),
    permissions: Object.freeze([...profile.permissions]),
  })
}

function copyTokenPair(pair: TokenPair): Readonly<TokenPair> | null {
  if (
    typeof pair !== 'object' ||
    pair === null ||
    typeof pair.accessToken !== 'string' ||
    pair.accessToken.length === 0 ||
    typeof pair.refreshToken !== 'string' ||
    pair.refreshToken.length === 0 ||
    !Number.isFinite(pair.accessTokenTtlMinutes) ||
    pair.accessTokenTtlMinutes <= 0 ||
    !Number.isFinite(pair.refreshTokenTtlDays) ||
    pair.refreshTokenTtlDays <= 0
  ) {
    return null
  }

  return Object.freeze({
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    accessTokenTtlMinutes: pair.accessTokenTtlMinutes,
    refreshTokenTtlDays: pair.refreshTokenTtlDays,
  })
}

function profilesMatch(current: Profile, next: Profile): boolean {
  return (
    current.userId === next.userId &&
    current.phone === next.phone &&
    current.fullname === next.fullname &&
    current.roles.length === next.roles.length &&
    current.roles.every((role, index) => role === next.roles[index]) &&
    current.permissions.length === next.permissions.length &&
    current.permissions.every(
      (permission, index) => permission === next.permissions[index],
    )
  )
}

export class SessionController {
  private readonly dependencies: SessionControllerDependencies
  private readonly listeners = new Set<() => void>()
  private readonly activeAbortControllers = new Set<AbortController>()
  private snapshot: SessionSnapshot = anonymousSnapshot
  private tokenState: TokenState | null = null
  private authEpoch = 0
  private tokenRevision = 0
  private profile: Profile | null = null
  private sessionScopeId: string | null = null
  private refreshFlight: RefreshFlight | null = null
  private logoutFlight: Promise<LogoutResult> | null = null
  private ownedLease: AdoptedAuthOwnerLease | null = null
  private terminatingLease: AdoptedAuthOwnerLease | null = null
  private disposed = false

  constructor(dependencies: SessionControllerDependencies) {
    if (
      dependencies.refreshThresholdMs !== undefined &&
      (!Number.isFinite(dependencies.refreshThresholdMs) ||
        dependencies.refreshThresholdMs < 0)
    ) {
      throw new TypeError('Invalid refresh threshold policy.')
    }

    this.dependencies = dependencies
  }

  getSnapshot = (): SessionSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    if (this.disposed) {
      return () => undefined
    }

    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Transfers an already-acquired auth-owner lease into the private session.
   * Before this call, login-flow failures remain responsible for releasing it.
   */
  async establishSession(
    tokenPair: TokenPair,
    ownedLease: AdoptedAuthOwnerLease,
  ): Promise<EstablishSessionResult> {
    if (this.disposed) {
      this.releaseLease(ownedLease)
      return { status: 'stale' }
    }

    if (this.terminatingLease === ownedLease) {
      return { status: 'stale' }
    }

    const previousLease = this.ownedLease
    const previousTerminatingLease = this.terminatingLease
    this.terminatingLease = null
    const epoch = this.invalidateForReplacement()
    if (previousLease && previousLease !== ownedLease) {
      this.releaseLease(previousLease)
    }
    if (
      previousTerminatingLease &&
      previousTerminatingLease !== ownedLease &&
      previousTerminatingLease !== previousLease
    ) {
      this.releaseLease(previousTerminatingLease)
    }

    const cacheCleanup = this.cleanCache()
    const nextTokenState = this.createTokenState(tokenPair)
    if (!nextTokenState) {
      this.releaseLease(ownedLease)
      this.setSnapshot(Object.freeze({ phase: 'bootstrap-error' }))
      await cacheCleanup
      return { status: 'bootstrap-error' }
    }

    this.ownedLease = ownedLease
    this.tokenState = nextTokenState
    this.setSnapshot(Object.freeze({ phase: 'bootstrapping' }))
    await cacheCleanup

    if (!this.isCurrentEpoch(epoch)) {
      return { status: 'stale' }
    }

    const operation = this.createOperationController()

    try {
      const profile = copyProfile(
        await this.dependencies.api.getMe(nextTokenState.pair.accessToken, {
          signal: operation.signal,
        }),
      )

      if (!this.isCurrentTokenState(epoch, nextTokenState)) {
        return { status: 'stale' }
      }

      const sessionScopeId = this.createScopeId()
      if (!profile || !sessionScopeId) {
        await this.failBootstrap(epoch, 'bootstrap-error')
        return { status: 'bootstrap-error' }
      }

      this.profile = profile
      this.sessionScopeId = sessionScopeId
      this.setSnapshot(
        Object.freeze({
          phase: 'authenticated',
          profile,
          sessionScopeId,
        }),
      )

      return {
        status: 'authenticated',
        profile,
        sessionScopeId,
      }
    } catch (error) {
      if (!this.isCurrentEpoch(epoch)) {
        return { status: 'stale' }
      }

      const safeError = normalizeUnknownError(error)
      if (isHttpStatus(safeError, 403)) {
        await this.failBootstrap(epoch, 'access-denied')
        return { status: 'access-denied' }
      }

      await this.failBootstrap(epoch, 'bootstrap-error')
      return { status: 'bootstrap-error' }
    } finally {
      this.releaseOperationController(operation)
    }
  }

  async ensureFreshSession(force = false): Promise<FreshSessionResult> {
    const tokenState = this.tokenState
    const epoch = this.authEpoch

    if (!this.hasActiveAuthenticatedSession(tokenState)) {
      return { status: 'anonymous' }
    }

    if (!force && !this.isNearExpiry(tokenState)) {
      return { status: 'fresh' }
    }

    const currentFlight = this.refreshFlight
    if (
      currentFlight &&
      currentFlight.epoch === epoch &&
      currentFlight.revision === tokenState.revision
    ) {
      return currentFlight.promise
    }

    const promise = this.runRefresh(epoch, tokenState, this.ownedLease)
    const flight: RefreshFlight = {
      epoch,
      revision: tokenState.revision,
      promise,
    }
    this.refreshFlight = flight

    try {
      return await promise
    } finally {
      if (this.refreshFlight === flight) {
        this.refreshFlight = null
      }
    }
  }

  async protectedRead<T>(
    operation: ProtectedOperation<T>,
  ): Promise<ProtectedOperationResult<T>> {
    const freshness = await this.ensureFreshSession()
    if (freshness.status !== 'fresh') {
      return this.mapFreshnessFailure(freshness)
    }

    const initial = await this.runProtectedOperation(operation)
    if (initial.kind === 'success') {
      return this.commitProtectedResult(initial)
    }

    if (!this.isCurrentEpoch(initial.epoch)) {
      return { status: 'session-ended' }
    }

    if (isHttpStatus(initial.error, 403)) {
      return { status: 'access-denied' }
    }

    if (!this.isRefreshableFailure(initial.error)) {
      return { status: 'failed' }
    }

    const currentTokenState = this.tokenState
    if (!this.hasActiveAuthenticatedSession(currentTokenState)) {
      return { status: 'session-ended' }
    }

    if (currentTokenState.revision === initial.revision) {
      const refreshed = await this.ensureFreshSession(true)
      if (refreshed.status !== 'fresh') {
        return this.mapFreshnessFailure(refreshed)
      }
    }

    const replay = await this.runProtectedOperation(operation)
    if (replay.kind === 'success') {
      return this.commitProtectedResult(replay)
    }

    if (!this.isCurrentEpoch(replay.epoch)) {
      return { status: 'session-ended' }
    }

    if (isHttpStatus(replay.error, 403)) {
      return { status: 'access-denied' }
    }

    if (this.isRefreshableFailure(replay.error)) {
      await this.terminateCurrentSession(replay.epoch)
      return { status: 'session-ended' }
    }

    return { status: 'failed' }
  }

  async protectedMutation<T>(
    operation: ProtectedOperation<T>,
  ): Promise<ProtectedOperationResult<T>> {
    const freshness = await this.ensureFreshSession()
    if (freshness.status !== 'fresh') {
      return this.mapFreshnessFailure(freshness)
    }

    const attempt = await this.runProtectedOperation(operation)
    if (attempt.kind === 'success') {
      return this.commitProtectedResult(attempt)
    }

    if (!this.isCurrentEpoch(attempt.epoch)) {
      return { status: 'session-ended' }
    }

    if (isHttpStatus(attempt.error, 403)) {
      return { status: 'access-denied' }
    }

    if (
      this.isRefreshableFailure(attempt.error) &&
      this.tokenState?.revision === attempt.revision
    ) {
      await this.terminateCurrentSession(attempt.epoch)
      return { status: 'session-ended' }
    }

    return { status: 'failed' }
  }

  async refreshProfile(): Promise<RefreshProfileResult> {
    const epoch = this.authEpoch
    const currentProfile = this.profile
    const currentScopeId = this.sessionScopeId

    if (
      this.snapshot.phase !== 'authenticated' ||
      !currentProfile ||
      !currentScopeId
    ) {
      return { status: 'session-ended' }
    }

    const result = await this.protectedRead(({ accessToken, signal }) =>
      this.dependencies.api.getMe(accessToken, { signal }),
    )

    if (result.status === 'access-denied') {
      await this.failBootstrap(epoch, 'access-denied')
      return { status: 'access-denied' }
    }

    if (result.status === 'anonymous' || result.status === 'session-ended') {
      return { status: 'session-ended' }
    }

    if (result.status === 'failed') {
      return { status: 'failed' }
    }

    const nextProfile = copyProfile(result.data)
    if (!nextProfile) {
      return { status: 'failed' }
    }

    if (
      !this.isCurrentEpoch(epoch) ||
      this.snapshot.phase !== 'authenticated' ||
      this.sessionScopeId !== currentScopeId
    ) {
      return { status: 'session-ended' }
    }

    const changed = !profilesMatch(currentProfile, nextProfile)
    if (changed) {
      await this.cleanCache()
      if (
        !this.isCurrentEpoch(epoch) ||
        this.snapshot.phase !== 'authenticated' ||
        this.sessionScopeId !== currentScopeId
      ) {
        return { status: 'session-ended' }
      }
    }

    this.profile = nextProfile
    this.setSnapshot(
      Object.freeze({
        phase: 'authenticated',
        profile: nextProfile,
        sessionScopeId: currentScopeId,
      }),
    )

    return { status: 'success', profile: nextProfile, changed }
  }

  logout(): Promise<LogoutResult> {
    if (this.disposed) {
      return Promise.resolve({
        status: 'local-cleared-remote-unconfirmed',
      })
    }

    if (this.logoutFlight) {
      return this.logoutFlight
    }

    const flight = this.runLogout()
    this.logoutFlight = flight

    const clearFlight = () => {
      if (this.logoutFlight === flight) {
        this.logoutFlight = null
      }
    }
    void flight.then(clearFlight, clearFlight)

    return flight
  }

  async resetSession(): Promise<void> {
    if (this.disposed || this.isEmptyAnonymousState()) {
      return
    }

    const lease = this.ownedLease
    const terminatingLease = this.terminatingLease
    this.ownedLease = null
    this.terminatingLease = null
    this.logoutFlight = null
    this.invalidateLocalState(anonymousSnapshot)
    this.releaseLease(lease)
    if (terminatingLease !== lease) {
      this.releaseLease(terminatingLease)
    }
    await this.cleanCache()
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return
    }

    this.disposed = true
    const lease = this.ownedLease
    const terminatingLease = this.terminatingLease
    this.ownedLease = null
    this.terminatingLease = null
    this.logoutFlight = null
    this.invalidateLocalState(anonymousSnapshot)
    this.releaseLease(lease)
    if (terminatingLease !== lease) {
      this.releaseLease(terminatingLease)
    }
    await this.cleanCache()
    this.listeners.clear()
  }

  private invalidateForReplacement(): number {
    this.authEpoch += 1
    this.abortActiveOperations()
    this.refreshFlight = null
    this.logoutFlight = null
    this.tokenState = null
    this.profile = null
    this.sessionScopeId = null
    this.ownedLease = null
    return this.authEpoch
  }

  private createTokenState(pair: TokenPair): TokenState | null {
    const copiedPair = copyTokenPair(pair)
    if (!copiedPair) {
      return null
    }

    let now: number
    try {
      now = this.dependencies.now()
    } catch {
      return null
    }

    const accessDeadlineMs =
      now + copiedPair.accessTokenTtlMinutes * 60_000
    if (!Number.isFinite(now) || !Number.isFinite(accessDeadlineMs)) {
      return null
    }

    const revision = this.tokenRevision + 1
    this.tokenRevision = revision

    return Object.freeze({
      pair: copiedPair,
      accessDeadlineMs,
      revision,
    })
  }

  private createScopeId(): string | null {
    try {
      const scopeId = this.dependencies.generateScopeId()
      return typeof scopeId === 'string' && scopeId.length > 0 ? scopeId : null
    } catch {
      return null
    }
  }

  private isNearExpiry(tokenState: TokenState): boolean {
    let now: number
    try {
      now = this.dependencies.now()
    } catch {
      return true
    }

    const threshold =
      this.dependencies.refreshThresholdMs ?? defaultRefreshThresholdMs
    return (
      !Number.isFinite(now) ||
      tokenState.accessDeadlineMs - now <= threshold
    )
  }

  private async runRefresh(
    epoch: number,
    tokenState: TokenState,
    lease: AdoptedAuthOwnerLease | null,
  ): Promise<FreshSessionResult> {
    if (!lease) {
      return { status: 'anonymous' }
    }

    const operation = this.createOperationController()

    try {
      const refreshedPair = await this.dependencies.api.refresh(
        tokenState.pair.refreshToken,
        { signal: operation.signal },
      )

      if (!this.isCurrentSession(epoch, tokenState, lease)) {
        return { status: 'stale' }
      }

      const refreshedTokenState = this.createTokenState(refreshedPair)
      if (!refreshedTokenState) {
        await this.terminateCurrentSession(epoch)
        return { status: 'terminal', reason: 'refresh-failed' }
      }

      this.tokenState = refreshedTokenState
      return { status: 'fresh' }
    } catch {
      if (!this.isCurrentSession(epoch, tokenState, lease)) {
        return { status: 'stale' }
      }

      await this.terminateCurrentSession(epoch)
      return { status: 'terminal', reason: 'refresh-failed' }
    } finally {
      this.releaseOperationController(operation)
    }
  }

  private async runProtectedOperation<T>(
    operation: ProtectedOperation<T>,
  ): Promise<OperationAttempt<T>> {
    const tokenState = this.tokenState
    const epoch = this.authEpoch
    if (!this.hasActiveAuthenticatedSession(tokenState)) {
      return {
        kind: 'failure',
        error: normalizeUnknownError(undefined),
        epoch,
        revision: this.tokenRevision,
      }
    }

    const controller = this.createOperationController()

    try {
      const data = await operation({
        accessToken: tokenState.pair.accessToken,
        signal: controller.signal,
      })
      return {
        kind: 'success',
        data,
        epoch,
        revision: tokenState.revision,
      }
    } catch (error) {
      return {
        kind: 'failure',
        error: normalizeUnknownError(error),
        epoch,
        revision: tokenState.revision,
      }
    } finally {
      this.releaseOperationController(controller)
    }
  }

  private commitProtectedResult<T>(
    attempt: OperationSuccess<T>,
  ): ProtectedOperationResult<T> {
    if (!this.isCurrentEpoch(attempt.epoch)) {
      return { status: 'session-ended' }
    }

    return { status: 'success', data: attempt.data }
  }

  private isRefreshableFailure(error: SafeApiError): boolean {
    if (isHttpStatus(error, 403)) {
      return false
    }

    try {
      return (
        this.dependencies.isRefreshableAuthFailure?.(error) ??
        defaultRefreshFailureClassifier(error)
      )
    } catch {
      return false
    }
  }

  private async runLogout(): Promise<LogoutResult> {
    const accessToken = this.tokenState?.pair.accessToken ?? null
    const lease = this.ownedLease
    this.ownedLease = null
    this.terminatingLease = lease
    const logoutEpoch = this.authEpoch + 1
    this.invalidateLocalState(Object.freeze({ phase: 'terminating' }))
    const cacheCleanup = this.cleanCache()

    let remoteConfirmed = false
    if (accessToken) {
      const operation = this.createOperationController()
      try {
        await this.dependencies.api.logout(accessToken, {
          signal: operation.signal,
        })
        remoteConfirmed = true
      } catch {
        remoteConfirmed = false
      } finally {
        this.releaseOperationController(operation)
      }
    }

    await cacheCleanup
    if (this.terminatingLease === lease) {
      this.terminatingLease = null
    }
    this.releaseLease(lease)

    if (
      this.authEpoch === logoutEpoch &&
      this.snapshot.phase === 'terminating'
    ) {
      this.setSnapshot(anonymousSnapshot)
    }

    return remoteConfirmed
      ? { status: 'remote-confirmed' }
      : { status: 'local-cleared-remote-unconfirmed' }
  }

  private async failBootstrap(
    epoch: number,
    phase: 'bootstrap-error' | 'access-denied',
  ): Promise<void> {
    if (!this.isCurrentEpoch(epoch)) {
      return
    }

    const lease = this.ownedLease
    this.ownedLease = null
    this.invalidateLocalState(Object.freeze({ phase }))
    this.releaseLease(lease)
    await this.cleanCache()
  }

  private async terminateCurrentSession(epoch: number): Promise<void> {
    if (!this.isCurrentEpoch(epoch)) {
      return
    }

    const lease = this.ownedLease
    this.ownedLease = null
    this.invalidateLocalState(anonymousSnapshot)
    this.releaseLease(lease)
    await this.cleanCache()
  }

  private invalidateLocalState(snapshot: SessionSnapshot): void {
    this.authEpoch += 1
    this.abortActiveOperations()
    this.refreshFlight = null
    this.tokenState = null
    this.profile = null
    this.sessionScopeId = null
    this.setSnapshot(snapshot)
  }

  private hasActiveAuthenticatedSession(
    tokenState: TokenState | null,
  ): tokenState is TokenState {
    return (
      !this.disposed &&
      this.snapshot.phase === 'authenticated' &&
      tokenState !== null &&
      this.ownedLease !== null
    )
  }

  private isCurrentEpoch(epoch: number): boolean {
    return !this.disposed && epoch === this.authEpoch
  }

  private isCurrentTokenState(epoch: number, tokenState: TokenState): boolean {
    return this.isCurrentEpoch(epoch) && this.tokenState === tokenState
  }

  private isCurrentSession(
    epoch: number,
    tokenState: TokenState,
    lease: AdoptedAuthOwnerLease,
  ): boolean {
    return (
      this.isCurrentTokenState(epoch, tokenState) &&
      this.ownedLease === lease &&
      this.snapshot.phase === 'authenticated'
    )
  }

  private mapFreshnessFailure(
    result: Exclude<FreshSessionResult, { readonly status: 'fresh' }>,
  ): ProtectedOperationResult<never> {
    return result.status === 'anonymous'
      ? { status: 'anonymous' }
      : { status: 'session-ended' }
  }

  private createOperationController(): AbortController {
    const controller = new AbortController()
    this.activeAbortControllers.add(controller)
    return controller
  }

  private releaseOperationController(controller: AbortController): void {
    this.activeAbortControllers.delete(controller)
  }

  private abortActiveOperations(): void {
    for (const controller of this.activeAbortControllers) {
      controller.abort()
    }
    this.activeAbortControllers.clear()
  }

  private cleanCache(): Promise<void> {
    let cancellation: Promise<void> | void
    try {
      cancellation = this.dependencies.cache.cancel()
    } catch {
      cancellation = undefined
    }

    try {
      this.dependencies.cache.clear()
    } catch {
      // Cache cleanup is best effort and never exposes adapter errors.
    }

    return Promise.resolve(cancellation).catch(() => undefined)
  }

  private setSnapshot(snapshot: SessionSnapshot): void {
    this.snapshot = snapshot

    for (const listener of this.listeners) {
      try {
        listener()
      } catch {
        // One subscriber must not block lifecycle cleanup for the others.
      }
    }
  }

  private releaseLease(lease: AdoptedAuthOwnerLease | null): void {
    try {
      lease?.release()
    } catch {
      // Lease cleanup must not expose adapter failures or retain credentials.
    }
  }

  private isEmptyAnonymousState(): boolean {
    return (
      this.snapshot.phase === 'anonymous' &&
      this.tokenState === null &&
      this.profile === null &&
      this.sessionScopeId === null &&
      this.refreshFlight === null &&
      this.ownedLease === null &&
      this.terminatingLease === null &&
      this.activeAbortControllers.size === 0
    )
  }
}
