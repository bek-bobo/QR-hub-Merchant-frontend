import { useMessages } from '@/shared/i18n/useMessages'
import { LoginForm } from '@/features/auth/LoginForm'
import { useAuth } from '@/shared/auth/useAuth'
import { AuthShell } from './AuthPresentation'

export function LoginPage() {
  const { message } = useMessages('auth')
  const { actions, loginSnapshot, logoutMessage } = useAuth()

  return (
    <AuthShell notice={logoutMessage ? (
      <p className="w-full rounded-xl border bg-surface px-4 py-3 text-sm text-text-secondary"
        role="status" aria-live="polite">
        {message('logout.remoteUnconfirmed')}
      </p>
    ) : null}>
      <LoginForm actions={actions} snapshot={loginSnapshot} />
    </AuthShell>
  )
}
