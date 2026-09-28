import { createContext, useContext } from 'react'
import type { LoginSnapshot } from '@/shared/auth/login-controller'
import type { Profile } from '@/shared/auth/model'
import type { SessionSnapshot } from '@/shared/auth/session-controller'

export interface LoginActions {
  startLogin(phone: string): Promise<void>
  submitOtp(otpCode: string): Promise<void>
  submitPin(pin: string): Promise<void>
  submitNewPin(pin: string, confirmation: string): Promise<void>
  startReset(): Promise<void>
  resendOtp(): Promise<void>
  restart(): void
  getOtpRemainingMs(): number
}

export interface AuthActions extends LoginActions {
  refreshProfile(): Promise<void>
  logout(): Promise<void>
}

export interface AuthPendingState {
  readonly login: boolean
  readonly profileRefresh: boolean
  readonly logout: boolean
}

export type AuthSource = 'live' | 'demo'

export interface AuthContextValue {
  readonly source: AuthSource
  readonly sessionPhase: SessionSnapshot['phase']
  readonly sessionScopeId: string | null
  readonly profile: Profile | null
  readonly loginSnapshot: LoginSnapshot
  readonly pending: AuthPendingState
  readonly unavailable: boolean
  readonly profileRefreshMessage: string | null
  readonly logoutMessage: string | null
  readonly actions: AuthActions
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return value
}
