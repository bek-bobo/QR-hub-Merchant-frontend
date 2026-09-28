import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { AuthApi } from '@/shared/api/auth-api'
import { createProtectedReadBridge } from '@/shared/api/protected-read'
import { ProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import { isReadQueryKey } from '@/shared/api/read-keys'
import { AccessProvider } from '@/shared/auth/AccessContext'
import type { AccessContextValue } from '@/shared/auth/access'
import { createBrowserAuthDeviceLease } from '@/shared/auth/device-lease'
import { LoginController } from '@/shared/auth/login-controller'
import { resolveLogoutMessage } from '@/shared/auth/logout-message'
import { SessionController, type ProtectedOperation, type SessionCache } from '@/shared/auth/session-controller'
import {
  AuthContext,
  type AuthActions,
  type AuthContextValue,
} from '@/shared/auth/useAuth'

interface AuthProviderProps {
  readonly api: AuthApi
  readonly children: ReactNode
}

function createSessionCache(queryClient: QueryClient): SessionCache {
  return {
    cancel: () =>
      queryClient.cancelQueries({
        predicate: (query) => isReadQueryKey(query.queryKey),
      }),
    clear: () =>
      queryClient.removeQueries({
        predicate: (query) => isReadQueryKey(query.queryKey),
      }),
  }
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

export function AuthProvider({ api, children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const [controllers] = useState(() => {
    const lease = createBrowserAuthDeviceLease()
    const session = new SessionController({
      api,
      cache: createSessionCache(queryClient),
      now: () => Date.now(),
      generateScopeId: () => crypto.randomUUID(),
    })
    const login = new LoginController({
      api,
      lease,
      session,
      now: () => Date.now(),
    })

    return { lease, login, session }
  })
  const [cleanupGuard] = useState(() => createDeferredCleanupGuard())
  const protectedReadContext = useMemo(
    () => ({
      bridge: createProtectedReadBridge(controllers.session),
      getSessionSnapshot: controllers.session.getSnapshot,
      protectedMutation: <T,>(operation: ProtectedOperation<T>) => controllers.session.protectedMutation(operation),
    }),
    [controllers.session],
  )
  const profileRefreshFlight = useRef<Promise<void> | null>(null)
  const logoutFlight = useRef<Promise<void> | null>(null)
  const [profileRefreshPending, setProfileRefreshPending] = useState(false)
  const [profileRefreshMessage, setProfileRefreshMessage] = useState<
    string | null
  >(null)
  const [logoutPending, setLogoutPending] = useState(false)
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null)
  const sessionSnapshot = useSyncExternalStore(
    controllers.session.subscribe,
    controllers.session.getSnapshot,
    controllers.session.getSnapshot,
  )
  const loginSnapshot = useSyncExternalStore(
    controllers.login.subscribe,
    controllers.login.getSnapshot,
    controllers.login.getSnapshot,
  )

  useEffect(() => {
    const revision = cleanupGuard.beginLifecycle()

    return () => {
      queueMicrotask(() => {
        if (!cleanupGuard.isCurrent(revision)) {
          return
        }

        controllers.login.dispose()
        void controllers.session.dispose()
        controllers.lease.dispose()
      })
    }
  }, [cleanupGuard, controllers])

  useEffect(() => {
    if (
      sessionSnapshot.phase === 'anonymous' &&
      loginSnapshot.phase === 'complete'
    ) {
      controllers.login.restart()
    }
  }, [controllers, loginSnapshot.phase, sessionSnapshot.phase])

  const actions = useMemo<AuthActions>(
    () => ({
      startLogin: (phone) => controllers.login.startLogin(phone),
      submitOtp: (otpCode) => controllers.login.submitOtp(otpCode),
      submitPin: (pin) => controllers.login.submitPin(pin),
      submitNewPin: (pin, confirmation) =>
        controllers.login.submitNewPin(pin, confirmation),
      startReset: () => controllers.login.startReset(),
      resendOtp: () => controllers.login.resendOtp(),
      restart: () => {
        setLogoutMessage(null)
        controllers.login.restart()
      },
      getOtpRemainingMs: () => controllers.login.getOtpRemainingMs(),
      refreshProfile: () => {
        if (profileRefreshFlight.current) {
          return profileRefreshFlight.current
        }

        const run = async () => {
          setProfileRefreshPending(true)
          setProfileRefreshMessage(null)
          try {
            const result = await controllers.session.refreshProfile()
            if (result.status === 'success') {
              setProfileRefreshMessage(
                result.changed
                  ? 'Ma’lumotlar yangilandi.'
                  : 'Ma’lumotlarda o‘zgarish yo‘q.',
              )
            } else if (result.status === 'failed') {
              setProfileRefreshMessage('Ma’lumotlarni yangilab bo‘lmadi.')
            }
          } finally {
            profileRefreshFlight.current = null
            setProfileRefreshPending(false)
          }
        }

        const flight = run()
        profileRefreshFlight.current = flight
        return flight
      },
      logout: () => {
        if (logoutFlight.current) {
          return logoutFlight.current
        }

        const run = async () => {
          setLogoutPending(true)
          setLogoutMessage(null)
          setProfileRefreshMessage(null)
          try {
            const result = await controllers.session.logout()
            controllers.login.restart()
        setLogoutMessage(resolveLogoutMessage(result))
          } finally {
            logoutFlight.current = null
            setLogoutPending(false)
          }
        }

        const flight = run()
        logoutFlight.current = flight
        return flight
      },
    }),
    [controllers],
  )

  const profile =
    sessionSnapshot.phase === 'authenticated'
      ? sessionSnapshot.profile
      : null
  const access = useMemo<AccessContextValue>(
    () =>
      profile
        ? {
            kind: 'authenticated',
            permissions: new Set(profile.permissions),
          }
        : { kind: 'anonymous' },
    [profile],
  )
  const value = useMemo<AuthContextValue>(
    () => ({
      source: 'live',
      sessionPhase: sessionSnapshot.phase,
      sessionScopeId:
        sessionSnapshot.phase === 'authenticated'
          ? sessionSnapshot.sessionScopeId
          : null,
      profile,
      loginSnapshot,
      pending: {
        login: loginSnapshot.pending,
        profileRefresh: profileRefreshPending,
        logout: logoutPending,
      },
      unavailable: loginSnapshot.phase === 'unavailable',
      profileRefreshMessage,
      logoutMessage,
      actions,
    }),
    [
      actions,
      loginSnapshot,
      logoutMessage,
      logoutPending,
      profile,
      profileRefreshMessage,
      profileRefreshPending,
      sessionSnapshot,
    ],
  )

  return (
    <ProtectedReadContext value={protectedReadContext}>
      <AuthContext.Provider value={value}>
        <AccessProvider value={access}>{children}</AccessProvider>
      </AuthContext.Provider>
    </ProtectedReadContext>
  )
}
