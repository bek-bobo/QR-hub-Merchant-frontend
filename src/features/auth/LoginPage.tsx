import { LoginForm } from '@/features/auth/LoginForm'
import { useAuth } from '@/shared/auth/useAuth'

export function LoginPage() {
  const { actions, loginSnapshot, logoutMessage } = useAuth()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-workspace px-4 py-10 sm:px-6">
      <section className="flex w-full max-w-[440px] flex-col items-center gap-6" aria-labelledby="login-brand">
        <div className="text-center">
          <p id="login-brand" className="text-2xl font-semibold tracking-tight text-text-primary">
            QRHub <span className="text-brand">Merchant</span>
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Merchant boshqaruv tizimi
          </p>
        </div>
        {logoutMessage ? (
          <p
            className="w-full max-w-[420px] rounded-lg border bg-surface px-4 py-3 text-sm text-text-secondary"
            role="status"
            aria-live="polite"
          >
            {logoutMessage}
          </p>
        ) : null}
        <LoginForm actions={actions} snapshot={loginSnapshot} />
      </section>
    </main>
  )
}
