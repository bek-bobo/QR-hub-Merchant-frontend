export interface TokenPair {
  readonly accessToken: string
  readonly refreshToken: string
  readonly accessTokenTtlMinutes: number
  readonly refreshTokenTtlDays: number
}

export type AuthStage =
  | 'phone'
  | 'otp'
  | 'reset-otp'
  | 'pin'
  | 'set-pin'
  | 'done'
  | 'expired'
  | 'logged-out'

export interface StageReply {
  readonly stage: AuthStage
  readonly phone?: string
  readonly otpId?: string
  readonly expiresInSeconds?: number
  readonly tokenPair?: TokenPair
}

export interface CreatedAuthSession {
  readonly sessionKey: string
  readonly reply: StageReply
}

export interface Profile {
  readonly userId: string
  readonly phone: string
  readonly fullname: string | null
  readonly roles: readonly string[]
  readonly permissions: readonly string[]
}

export interface RequestOptions {
  readonly signal?: AbortSignal
}
