import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/shared/auth/useAuth'
import { AccountPage } from './AccountPage'

describe('AccountPage', () => {
  it('formats the visible phone without changing the source profile value', () => {
    const profile = {
      userId: 'merchant-user-1',
      phone: '998881017980',
      fullname: 'Test Merchant',
      roles: ['ROLE_MERCHANT_USER'],
      permissions: ['GET_ME'],
    } as const
    const auth: AuthContextValue = {
      source: 'live',
      sessionPhase: 'authenticated',
      sessionScopeId: 'session-1',
      profile,
      loginSnapshot: {
        phase: 'complete',
        flow: 'login',
        pending: false,
        phone: profile.phone,
      },
      pending: {
        login: false,
        profileRefresh: false,
        logout: false,
      },
      unavailable: false,
      profileRefreshMessage: null,
      logoutMessage: null,
      actions: {
        startLogin: vi.fn(async () => undefined),
        submitOtp: vi.fn(async () => undefined),
        submitPin: vi.fn(async () => undefined),
        submitNewPin: vi.fn(async () => undefined),
        startReset: vi.fn(async () => undefined),
        resendOtp: vi.fn(async () => undefined),
        restart: vi.fn(),
        getOtpRemainingMs: vi.fn(() => 0),
        refreshProfile: vi.fn(async () => undefined),
        logout: vi.fn(async () => undefined),
      },
    }

    const html = renderToStaticMarkup(
      <AuthContext.Provider value={auth}>
        <AccountPage />
      </AuthContext.Provider>,
    )

    expect(html).toContain('+998 88 101 79 80')
    expect(html).not.toContain('+998881017980')
    expect(html.match(/<h1\b/g)).toBeNull()
    expect(html).toContain('Hisob ma’lumotlari')
    expect(html).not.toContain('Joriy kirish sessiyasiga tegishli tasdiqlangan profil.')
    expect(profile.phone).toBe('998881017980')
  })
})
