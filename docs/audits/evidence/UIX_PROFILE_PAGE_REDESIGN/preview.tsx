// Local presentation fixture only. No authentication store, credentials or API calls.
import { createRoot } from 'react-dom/client'
import { AccountPage } from '/src/features/account/AccountPage'
import { AuthContext } from '/src/shared/auth/useAuth'
import { LocaleProvider } from '/src/shared/i18n/LocaleProvider'
import { createLocaleRuntime } from '/src/shared/i18n/runtime'
import { ThemeProvider } from '/src/shared/theme/ThemeProvider'
import '/src/index.css'
const locale=createLocaleRuntime();await locale.initialize('en')
const noop=async()=>{}
const value={source:'live',sessionPhase:'authenticated',sessionScopeId:'synthetic-local-profile',
profile:{userId:'synthetic-local-user',fullname:'LongUnbrokenName'.repeat(18),phone:'998901234567',roles:['ROLE_FUTURE'],permissions:[]},
loginSnapshot:{phase:'complete',flow:'login',pending:false},pending:{login:false,profileRefresh:false,logout:false},
unavailable:false,profileRefreshMessage:null,logoutMessage:null,
actions:{startLogin:noop,submitOtp:noop,submitPin:noop,submitNewPin:noop,startReset:noop,resendOtp:noop,restart(){},getOtpRemainingMs:()=>0,refreshProfile:noop,logout:noop}}
createRoot(document.getElementById('root')!).render(<LocaleProvider runtime={locale}><ThemeProvider><AuthContext value={value}><main className="min-h-dvh bg-workspace p-4"><p className="mb-4 text-sm text-text-secondary">LOCAL SYNTHETIC PROFILE — no backend requests; actions are inert.</p><AccountPage/></main></AuthContext></ThemeProvider></LocaleProvider>)
