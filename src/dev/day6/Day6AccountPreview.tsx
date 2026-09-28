import { Link } from 'react-router'
import { AccountPage } from '@/features/account/AccountPage'
import { AuthContext, type AuthContextValue } from '@/shared/auth/useAuth'

const noOp = async () => undefined

const accountPreviewAuth: AuthContextValue = {
  source: 'demo',
  sessionPhase: 'authenticated',
  sessionScopeId: 'd6-p5-demo-account',
  profile: {
    userId: 'D6-P5-DEMO-ACCOUNT',
    fullname:
      'D6-P5-DEMO-AbdullayevAbdullayevAbdullayevAbdullayevVeryLongUnbrokenFullname',
    phone: '998901234567890123456789012345678901234567890',
    roles: [],
    permissions: [],
  },
  loginSnapshot: { phase: 'complete', flow: 'login', pending: false },
  pending: { login: false, profileRefresh: false, logout: false },
  unavailable: false,
  profileRefreshMessage: 'DEV-only static profile; buttons do not call a backend.',
  logoutMessage: null,
  actions: {
    startLogin: noOp,
    submitOtp: noOp,
    submitPin: noOp,
    submitNewPin: noOp,
    startReset: noOp,
    resendOtp: noOp,
    restart: () => undefined,
    getOtpRemainingMs: () => 0,
    refreshProfile: noOp,
    logout: noOp,
  },
}

// D6-P5-DEMO-ONLY. The real AccountPage receives a RAM-only profile and no credentials.
export function Day6AccountPreview() {
  return (
    <AuthContext.Provider value={accountPreviewAuth}>
      <div className="space-y-5">
        <Link
          to="/dev/day6/devices"
          className="inline-flex text-sm text-brand underline-offset-4 hover:underline"
        >
          P5 previewga qaytish
        </Link>
        <AccountPage />
      </div>
    </AuthContext.Provider>
  )
}
