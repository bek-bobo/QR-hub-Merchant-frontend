import { useEffect, useState, useSyncExternalStore } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LoginPage } from '@/features/auth/LoginPage'
import { AccessProvider } from '@/shared/auth/AccessContext'
import type { AccessContextValue } from '@/shared/auth/access'
import { AuthContext } from '@/shared/auth/useAuth'
import type { SessionCache } from '@/shared/auth/session-controller'
import {
  createAuthPreviewRuntime,
  type AuthPreviewRuntime,
} from '@/dev/auth/auth-preview-runtime'
import type { AuthPreviewScenario } from '@/dev/auth/auth-simulator'

const scenarioOptions: readonly {
  readonly value: AuthPreviewScenario
  readonly label: string
}[] = [
  { value: 'first-login', label: 'First login / first PIN' },
  { value: 'existing-pin', label: 'Existing PIN' },
  { value: 'known-device', label: 'Known device → direct PIN' },
  { value: 'reset-pin', label: 'Reset PIN' },
  { value: 'wrong-otp', label: 'Wrong OTP' },
  { value: 'wrong-pin', label: 'Wrong PIN' },
  { value: 'otp-expired', label: 'OTP expired' },
  { value: 'device-blocked', label: 'Device blocked' },
  { value: 'unknown-stage', label: 'Unknown stage / contract error' },
  { value: 'profile-403', label: 'Profile 403' },
  { value: 'refresh-success', label: 'Refresh success' },
  { value: 'refresh-failure', label: 'Refresh failure' },
]

const emptyPreviewAccess: AccessContextValue = {
  kind: 'demo',
  grants: new Set(),
}

interface DeferredCleanupGuard {
  beginLifecycle(): number
  isCurrent(revision: number): boolean
}

function createDeferredCleanupGuard(): DeferredCleanupGuard {
  let currentRevision = 0
  return {
    beginLifecycle: () => {
      currentRevision += 1
      return currentRevision
    },
    isCurrent: (revision) => currentRevision === revision,
  }
}

function isAuthPreviewScenario(value: string): value is AuthPreviewScenario {
  return scenarioOptions.some((option) => option.value === value)
}

function createPreviewCache(queryClient: QueryClient): SessionCache {
  const isPreviewQuery = (queryKey: readonly unknown[]) =>
    queryKey[0] === 'auth-preview'

  return {
    cancel: () =>
      queryClient.cancelQueries({
        predicate: (query) => isPreviewQuery(query.queryKey),
      }),
    clear: () =>
      queryClient.removeQueries({
        predicate: (query) => isPreviewQuery(query.queryKey),
      }),
  }
}

function AuthPreviewRuntimeView({
  scenario,
}: {
  readonly scenario: AuthPreviewScenario
}) {
  const queryClient = useQueryClient()
  const [runtime] = useState<AuthPreviewRuntime>(() =>
    createAuthPreviewRuntime(scenario, createPreviewCache(queryClient)),
  )
  const [cleanupGuard] = useState(() => createDeferredCleanupGuard())
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  )

  useEffect(() => {
    const revision = cleanupGuard.beginLifecycle()
    return () => {
      queueMicrotask(() => {
        if (cleanupGuard.isCurrent(revision)) {
          void runtime.dispose()
        }
      })
    }
  }, [cleanupGuard, runtime])

  const authenticated = snapshot.session.phase === 'authenticated'
  const refreshScenario =
    scenario === 'refresh-success' || scenario === 'refresh-failure'
  const refreshControlsDisabled =
    !authenticated || !refreshScenario || snapshot.controlPending
  const canExpireOtp =
    scenario === 'otp-expired' &&
    (snapshot.login.phase === 'otp' || snapshot.login.phase === 'reset-otp')

  return (
    <AuthContext.Provider value={runtime.getAuthContextValue()}>
      <AccessProvider value={emptyPreviewAccess}>
        {canExpireOtp ? (
          <div className="fixed bottom-4 right-4 z-40">
            <Button
              type="button"
              variant="outline"
              className="bg-surface shadow-lg"
              onClick={() => runtime.expireOtpNow()}
            >
              Hozir expire qilish
            </Button>
          </div>
        ) : null}
        <section className="border-b bg-workspace px-4 py-6 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Lifecycle holati</CardTitle>
                <CardDescription>
                  Faqat normalized controller phase va xavfsiz counterlar.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <p>Login phase: {snapshot.login.phase}</p>
                <p>Session phase: {snapshot.session.phase}</p>
                <p>Refresh calls: {snapshot.simulator.refreshCalls}</p>
                <p>Get-me calls: {snapshot.simulator.getMeCalls}</p>
                <p>Logout calls: {snapshot.simulator.logoutCalls}</p>
                <p>Protected reads: {snapshot.protectedReadCalls}</p>
                <p>Preview lease: {snapshot.leaseOwned ? 'owned' : 'released'}</p>
                <p>
                  Refresh deferred:{' '}
                  {snapshot.simulator.refreshPending ? 'pending' : 'idle'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dev controllar</CardTitle>
                <CardDescription>
                  Auth baseline yashirin yaratilmaydi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={refreshControlsDisabled}
                  onClick={() => void runtime.runParallelProtectedReads()}
                >
                  Parallel himoyalangan so‘rovlar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={refreshControlsDisabled}
                  onClick={() => void runtime.runLogoutDuringRefresh()}
                >
                  Refresh paytida chiqish
                </Button>
                <Button
                  type="button"
                  className="w-full bg-brand hover:bg-primary-hover"
                  disabled={snapshot.controlPending}
                  onClick={() => void runtime.logout()}
                >
                  Preview sessiyasidan chiqish
                </Button>

                {!refreshScenario ? (
                  <p className="text-xs text-text-secondary">
                    Refresh controllari uchun refresh success yoki refresh
                    failure scenario’sini tanlang.
                  </p>
                ) : !authenticated ? (
                  <p className="text-xs text-text-secondary">
                    Avval real LoginController oqimini va get-me bootstrapni
                    qo‘lda yakunlang.
                  </p>
                ) : null}

                {snapshot.statusMessage ? (
                  <p
                    className="rounded-lg bg-muted px-3 py-2 text-sm text-text-secondary"
                    role="status"
                    aria-live="polite"
                  >
                    {snapshot.statusMessage}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Scenario diagnostikasi</CardTitle>
                <CardDescription>
                  Faqat dev-only normalized identity va transition metadata.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p>Selected: {scenario}</p>
                <p>Runtime: {snapshot.runtimeScenario}</p>
                <p>Simulator: {snapshot.simulator.simulatorScenario}</p>
                <p>
                  Last: {snapshot.simulator.lastSimulatorMethod} →{' '}
                  {snapshot.simulator.lastReturnedNormalizedStage ?? 'none'}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <LoginPage />
      </AccessProvider>
    </AuthContext.Provider>
  )
}

export default function AuthPreviewPage() {
  const [scenario, setScenario] =
    useState<AuthPreviewScenario>('first-login')
  const [resetRevision, setResetRevision] = useState(0)

  return (
    <div className="min-h-dvh bg-workspace">
      <header className="sticky top-0 z-20 border-b border-brand/20 bg-brand-soft px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-brand/40 text-brand">
                DEV AUTH PREVIEW
              </Badge>
              <p className="font-semibold text-text-primary">
                Auth sinov muhiti — backendga ulanmagan
              </p>
            </div>
            <Link
              to="/dashboard"
              className="mt-2 inline-flex text-sm text-brand underline-offset-4 hover:underline"
            >
              Day 01 dashboardga qaytish
            </Link>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm font-medium text-text-primary">
              Scenario
              <select
                className="h-10 min-w-64 rounded-md border bg-surface px-3 text-sm"
                value={scenario}
                onChange={(event) => {
                  if (isAuthPreviewScenario(event.target.value)) {
                    setScenario(event.target.value)
                    setResetRevision((revision) => revision + 1)
                  }
                }}
              >
                {scenarioOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetRevision((revision) => revision + 1)}
            >
              Scenarioni reset qilish
            </Button>
          </div>
        </div>
      </header>

      <AuthPreviewRuntimeView
        key={`${scenario}:${resetRevision}`}
        scenario={scenario}
      />
    </div>
  )
}
