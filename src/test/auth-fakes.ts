import type { AuthApi } from '@/shared/api/auth-api'
import { safeContractError } from '@/shared/api/errors'
import type { Profile, TokenPair } from '@/shared/auth/model'

export interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (reason: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => undefined
  let rejectPromise: (reason: unknown) => void = () => undefined
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return { promise, resolve: resolvePromise, reject: rejectPromise }
}

function unexpected<T>(): Promise<T> {
  return Promise.reject(safeContractError())
}

export function makeAuthApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    createSession: () => unexpected(),
    sendOtp: () => unexpected(),
    resendOtp: () => unexpected(),
    verifyOtp: () => unexpected(),
    checkPin: () => unexpected(),
    setPin: () => unexpected(),
    resetSendOtp: () => unexpected(),
    resetResendOtp: () => unexpected(),
    resetVerifyOtp: () => unexpected(),
    resetSetPin: () => unexpected(),
    refresh: () => unexpected(),
    getMe: () => unexpected(),
    logout: () => unexpected(),
    ...overrides,
  }
}

export const syntheticPairA: TokenPair = Object.freeze({
  accessToken: 'test-access-a',
  refreshToken: 'test-refresh-a',
  accessTokenTtlMinutes: 10,
  refreshTokenTtlDays: 1,
})

export const syntheticPairB: TokenPair = Object.freeze({
  accessToken: 'test-access-b',
  refreshToken: 'test-refresh-b',
  accessTokenTtlMinutes: 10,
  refreshTokenTtlDays: 1,
})

export const syntheticProfileA: Profile = Object.freeze({
  userId: 'test-user',
  phone: '998900000000',
  fullname: 'Test Merchant',
  roles: Object.freeze(['test-role']),
  permissions: Object.freeze(['test.profile.read']),
})

export const syntheticProfileB: Profile = Object.freeze({
  userId: 'test-user',
  phone: '998900000000',
  fullname: 'Updated Merchant',
  roles: Object.freeze(['updated-role']),
  permissions: Object.freeze(['updated.permission']),
})
