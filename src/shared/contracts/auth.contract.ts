import {
  safeBusinessError,
  safeContractError,
  safeHttpError,
  type SafeApiError,
} from '@/shared/api/errors'
import type {
  AuthStage,
  CreatedAuthSession,
  Profile,
  StageReply,
  TokenPair,
} from '@/shared/auth/model'

export interface AuthContractResponse {
  readonly ok: boolean
  readonly status: number
  readonly body: unknown
}

export interface VerifiedAuthWireContract {
  decodeCreateSession(payload: unknown): CreatedAuthSession
  decodeStageReply(payload: unknown): StageReply
  decodeTokenPair(payload: unknown): TokenPair
  decodeProfile(payload: unknown): Profile
  decodeLogout(payload: unknown): void
  classifyError(response: AuthContractResponse): SafeApiError | null
}

export type AuthContractRegistration =
  | { readonly kind: 'unavailable'; readonly missing: readonly string[] }
  | {
      readonly kind: 'verified'
      readonly wire: VerifiedAuthWireContract
      readonly evidence: readonly string[]
    }

type JsonObject = Record<string, unknown>

function objectValue(value: unknown): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw safeContractError()
  }

  return value as JsonObject
}

function nonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw safeContractError()
  }

  return value
}

function positiveInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw safeContractError()
  }

  return value as number
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw safeContractError()
  }

  return Object.freeze([...value])
}

function successData(payload: unknown): unknown {
  const envelope = objectValue(payload)

  if (envelope.success !== true || !Object.hasOwn(envelope, 'data')) {
    throw safeContractError()
  }

  return envelope.data
}

function decodeToken(value: unknown): TokenPair {
  const token = objectValue(value)

  return Object.freeze({
    accessToken: nonEmptyString(token.accessToken),
    refreshToken: nonEmptyString(token.refreshToken),
    accessTokenTtlMinutes: positiveInteger(token.accessTokenTtlMinutes),
    refreshTokenTtlDays: positiveInteger(token.refreshTokenTtlDays),
  })
}

const normalizedStages = {
  OTP: 'otp',
  OTP_VERIFY: 'otp',
  CHECK_PASSWORD: 'pin',
  SET_PASSWORD: 'set-pin',
  RESET_PASSWORD_OTP_VERIFY: 'reset-otp',
  DONE: 'done',
  EXPIRED: 'expired',
  LOGOUT: 'logged-out',
} as const satisfies Partial<Record<string, AuthStage>>

function decodeStageName(value: unknown): {
  readonly wire: keyof typeof normalizedStages
  readonly normalized: AuthStage
} {
  const wire = nonEmptyString(value)

  if (!Object.hasOwn(normalizedStages, wire)) {
    throw safeContractError()
  }

  const verifiedWire = wire as keyof typeof normalizedStages
  return { wire: verifiedWire, normalized: normalizedStages[verifiedWire] }
}

function decodeStageData(value: unknown): StageReply {
  const data = objectValue(value)
  const stage = decodeStageName(data.stage)
  const reply: {
    stage: AuthStage
    phone?: string
    otpId?: string
    expiresInSeconds?: number
    tokenPair?: TokenPair
  } = { stage: stage.normalized }

  if (data.phone !== undefined && data.phone !== null) {
    reply.phone = nonEmptyString(data.phone)
  }

  if (stage.wire === 'OTP_VERIFY' || stage.wire === 'RESET_PASSWORD_OTP_VERIFY') {
    reply.otpId = nonEmptyString(data.otpId)
    reply.expiresInSeconds = positiveInteger(data.expiresInSeconds)
  } else {
    if (data.otpId !== undefined && data.otpId !== null) {
      throw safeContractError()
    }
    if (data.expiresInSeconds !== undefined && data.expiresInSeconds !== null) {
      throw safeContractError()
    }
  }

  if (stage.wire === 'DONE') {
    reply.tokenPair = decodeToken(data.token)
  } else if (data.token !== undefined && data.token !== null) {
    throw safeContractError()
  }

  return Object.freeze(reply)
}

function classifyEnvelopeError(body: unknown): SafeApiError | null {
  let envelope: JsonObject

  try {
    envelope = objectValue(body)
  } catch {
    return safeContractError()
  }

  if (envelope.success === true) {
    return null
  }

  if (envelope.success !== false) {
    return safeContractError()
  }

  try {
    const error = objectValue(envelope.error)
    const code = error.code
    const tag = error.tag

    if (!Number.isSafeInteger(code) || typeof tag !== 'string' || tag.length === 0) {
      return safeContractError()
    }

    return safeBusinessError({ code: code as number, tag })
  } catch {
    return safeContractError()
  }
}

const productionAuthWireContract: VerifiedAuthWireContract = {
  decodeCreateSession(payload) {
    const data = objectValue(successData(payload))
    const stage = decodeStageName(data.stage)

    if (stage.wire !== 'OTP') {
      throw safeContractError()
    }

    return Object.freeze({
      sessionKey: nonEmptyString(data.sessionKey),
      reply: Object.freeze({ stage: stage.normalized }),
    })
  },

  decodeStageReply(payload) {
    return decodeStageData(successData(payload))
  },

  decodeTokenPair(payload) {
    return decodeToken(successData(payload))
  },

  decodeProfile(payload) {
    const data = objectValue(successData(payload))

    if (!Number.isSafeInteger(data.userId) || (data.userId as number) <= 0) {
      throw safeContractError()
    }
    if (data.fullname !== null && typeof data.fullname !== 'string') {
      throw safeContractError()
    }

    return Object.freeze({
      userId: String(data.userId),
      phone: nonEmptyString(data.phone),
      fullname: data.fullname,
      roles: stringArray(data.roles),
      permissions: stringArray(data.permissions),
    })
  },

  decodeLogout(payload) {
    const envelope = objectValue(payload)
    if (envelope.success !== true) {
      throw safeContractError()
    }
  },

  classifyError(response) {
    if (response.status === 401 || response.status === 403) {
      return safeHttpError(response.status)
    }

    const classified = classifyEnvelopeError(response.body)
    if (response.ok) {
      return classified
    }

    return classified?.kind === 'business'
      ? classified
      : safeHttpError(response.status)
  },
}

export const productionAuthContractRegistration: AuthContractRegistration = {
  kind: 'verified',
  wire: productionAuthWireContract,
  evidence: Object.freeze([
    'qh-merchant-auth-api Spring Boot 3.3.1 default Jackson enum serialization; application.yml has no enum override',
    'qh-lib-model:1.0.77 SessionStage identifiers with no JsonValue/JsonFormat/custom serializer',
    'qh-lib-shared:1.0.77 QrHubResponseDTO success/error/data and ErrorData code/tag/text fields',
    'qh-lib-shared:1.0.77 raw JwtAuthenticationEntryPoint HTTP 401 response',
  ]),
}
