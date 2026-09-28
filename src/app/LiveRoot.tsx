import { AppProviders } from '@/app/AppProviders'
import { LiveRouter } from '@/app/LiveRouter'
import { ReadProvider } from '@/app/read/ReadProvider'
import { createLiveAuthApi } from '@/shared/api/auth-api'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { productionAuthContractRegistration } from '@/shared/contracts/auth.contract'
import { IntegrationUnavailablePage } from '@/shared/ui/SystemPages'

const liveAuth = createLiveAuthApi({
  authBaseUrl: import.meta.env.VITE_AUTH_API_BASE_URL,
  environment: import.meta.env.DEV ? 'development' : 'production',
  contract: productionAuthContractRegistration,
})

export function LiveRoot() {
  if (liveAuth.kind === 'unavailable') {
    return <IntegrationUnavailablePage />
  }

  return (
    <AppProviders>
      <AuthProvider api={liveAuth.api}>
        <ReadProvider
          webBaseUrl={import.meta.env.VITE_WEB_API_BASE_URL}
          environment={import.meta.env.DEV ? 'development' : 'production'}
        >
          <LiveRouter />
        </ReadProvider>
      </AuthProvider>
    </AppProviders>
  )
}
