import {
  normalizeUnknownError,
  safeHttpError,
} from '@/shared/api/errors'
import {
  createHttpTransport,
  validateAuthBaseUrl,
  type HttpTransport,
  type RuntimeEnvironment,
} from '@/shared/api/http'
import type {
  CreatedAuthSession,
  Profile,
  RequestOptions,
  StageReply,
  TokenPair,
} from '@/shared/auth/model'
import type {
  AuthContractRegistration,
  VerifiedAuthWireContract,
} from '@/shared/contracts/auth.contract'
import { endpoints } from '@/shared/contracts/endpoints'

export interface AuthApi {
  createSession(
    deviceKey: string,
    options?: RequestOptions,
  ): Promise<CreatedAuthSession>
  sendOtp(
    sessionKey: string,
    phone: string,
    options?: RequestOptions,
  ): Promise<StageReply>
  resendOtp(sessionKey: string, options?: RequestOptions): Promise<StageReply>
  verifyOtp(
    sessionKey: string,
    request: { readonly otpId: string; readonly otpCode: string },
    options?: RequestOptions,
  ): Promise<StageReply>
  checkPin(
    sessionKey: string,
    pin: string,
    options?: RequestOptions,
  ): Promise<StageReply>
  setPin(
    sessionKey: string,
    pin: string,
    options?: RequestOptions,
  ): Promise<StageReply>
  resetSendOtp(
    sessionKey: string,
    phone: string,
    options?: RequestOptions,
  ): Promise<StageReply>
  resetResendOtp(
    sessionKey: string,
    options?: RequestOptions,
  ): Promise<StageReply>
  resetVerifyOtp(
    sessionKey: string,
    request: { readonly otpId: string; readonly otpCode: string },
    options?: RequestOptions,
  ): Promise<StageReply>
  resetSetPin(
    sessionKey: string,
    pin: string,
    options?: RequestOptions,
  ): Promise<StageReply>
  refresh(refreshToken: string, options?: RequestOptions): Promise<TokenPair>
  getMe(accessToken: string, options?: RequestOptions): Promise<Profile>
  logout(accessToken: string, options?: RequestOptions): Promise<void>
}

export type AuthApiFactoryResult =
  | { readonly kind: 'unavailable'; readonly reasons: readonly string[] }
  | { readonly kind: 'ready'; readonly api: AuthApi }

export interface LiveAuthApiFactoryOptions {
  readonly authBaseUrl: string | undefined
  readonly environment: RuntimeEnvironment
  readonly contract: AuthContractRegistration
  readonly fetchImpl?: typeof fetch
  readonly timeoutMs?: number
}

async function decodeResponse<T>(
  transportRequest: ReturnType<HttpTransport['request']>,
  contract: VerifiedAuthWireContract,
  decode: (payload: unknown) => T,
): Promise<T> {
  try {
    const response = await transportRequest
    const classified = contract.classifyError(response)

    if (classified) {
      throw classified
    }

    if (!response.ok) {
      throw safeHttpError(response.status)
    }

    return decode(response.body)
  } catch (error) {
    throw normalizeUnknownError(error)
  }
}

function createReadyAuthApi(
  transport: HttpTransport,
  contract: VerifiedAuthWireContract,
): AuthApi {
  const sessionCredential = (sessionKey: string) =>
    ({ kind: 'session-key', sessionKey }) as const
  const bearerCredential = (accessToken: string) =>
    ({ kind: 'bearer', accessToken }) as const

  return {
    createSession(deviceKey, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.createSession,
          credential: { kind: 'device-key', deviceKey },
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeCreateSession(payload),
      )
    },
    sendOtp(sessionKey, phone, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.sendOtp,
          credential: sessionCredential(sessionKey),
          body: { phone },
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeStageReply(payload),
      )
    },
    resendOtp(sessionKey, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.resendOtp,
          credential: sessionCredential(sessionKey),
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeStageReply(payload),
      )
    },
    verifyOtp(sessionKey, request, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.verifyOtp,
          credential: sessionCredential(sessionKey),
          body: request,
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeStageReply(payload),
      )
    },
    checkPin(sessionKey, pin, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.checkPin,
          credential: sessionCredential(sessionKey),
          body: { pin },
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeStageReply(payload),
      )
    },
    setPin(sessionKey, pin, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.setPin,
          credential: sessionCredential(sessionKey),
          body: { pin },
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeStageReply(payload),
      )
    },
    resetSendOtp(sessionKey, phone, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.resetSendOtp,
          credential: sessionCredential(sessionKey),
          body: { phone },
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeStageReply(payload),
      )
    },
    resetResendOtp(sessionKey, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.resetResendOtp,
          credential: sessionCredential(sessionKey),
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeStageReply(payload),
      )
    },
    resetVerifyOtp(sessionKey, request, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.resetVerifyOtp,
          credential: sessionCredential(sessionKey),
          body: request,
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeStageReply(payload),
      )
    },
    resetSetPin(sessionKey, pin, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.resetSetPin,
          credential: sessionCredential(sessionKey),
          body: { pin },
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeStageReply(payload),
      )
    },
    refresh(refreshToken, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.refresh,
          credential: { kind: 'public' },
          body: { refreshToken },
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeTokenPair(payload),
      )
    },
    getMe(accessToken, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.me,
          credential: bearerCredential(accessToken),
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeProfile(payload),
      )
    },
    logout(accessToken, options) {
      return decodeResponse(
        transport.request({
          endpoint: endpoints.logout,
          credential: bearerCredential(accessToken),
          signal: options?.signal,
        }),
        contract,
        (payload) => contract.decodeLogout(payload),
      )
    },
  }
}

export function createLiveAuthApi(
  options: LiveAuthApiFactoryOptions,
): AuthApiFactoryResult {
  const baseUrl = validateAuthBaseUrl(options.authBaseUrl, options.environment)
  const reasons: string[] = []

  if (baseUrl.kind === 'invalid') {
    reasons.push(baseUrl.error.message)
  }

  if (options.contract.kind === 'unavailable') {
    reasons.push(...options.contract.missing)
  }

  if (baseUrl.kind !== 'valid' || options.contract.kind !== 'verified') {
    return { kind: 'unavailable', reasons }
  }

  const transport = createHttpTransport({
    service: 'auth',
    baseUrl: baseUrl.value,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  })

  return {
    kind: 'ready',
    api: createReadyAuthApi(transport, options.contract.wire),
  }
}
