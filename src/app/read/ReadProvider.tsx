import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { can, type AccessContextValue } from '@/shared/auth/access'
import { useAuth } from '@/shared/auth/useAuth'
import { useProtectedReadContext } from '@/shared/api/ProtectedReadContext'
import type { RuntimeEnvironment } from '@/shared/api/http'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { createLiveReadApi } from './createLiveReadApi'
import { cleanupReadQueries, createReadRuntime } from './read-runtime'
import { createAccessRevisionTracker } from './read-scope'
import { useScopedActionRegistry } from './useScopedActionRegistry'
import {
  ReadRuntimeContext,
  type ReadRuntimeContextValue,
} from './useReadRuntime'

interface ReadProviderProps {
  readonly webBaseUrl: string | undefined
  readonly environment: RuntimeEnvironment
  readonly children: ReactNode
}

const requiredCapabilities = Object.freeze({
  dashboard: 'dashboard.read',
  dynamicQr: 'dynamicQr.read',
  terminalLookup: 'terminal.lookup',
  terminalList: 'terminal.read',
  bankAccountList: 'bankAccount.read',
  cashierList: 'cashier.read',
  merchantLookup: 'merchant.lookup',
  bankAccountLookup: 'bankAccount.lookup',
  p5List: 'p5.read',
  p5ResetPin: 'p5.resetPin',
} as const)

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return (
    left.source === right.source &&
    left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
  )
}

export function ReadProvider({
  webBaseUrl,
  environment,
  children,
}: ReadProviderProps) {
  const auth = useAuth()
  const { bridge, getSessionSnapshot } = useProtectedReadContext()
  const queryClient = useQueryClient()
  const [revisionTracker] = useState(() => createAccessRevisionTracker())
  const getCurrentState = useMemo(
    () => () => {
      const snapshot = getSessionSnapshot()
      const permissions =
        snapshot.phase === 'authenticated'
          ? snapshot.profile.permissions
          : []
      const access: AccessContextValue =
        snapshot.phase === 'authenticated'
          ? {
              kind: 'authenticated',
              permissions: new Set(permissions),
            }
          : { kind: 'anonymous' }

      return {
        scope: {
          source: 'live' as const,
          sessionScopeId:
            snapshot.phase === 'authenticated'
              ? snapshot.sessionScopeId
              : 'anonymous',
          accessRevision: revisionTracker.update(permissions),
        },
        access,
      }
    },
    [getSessionSnapshot, revisionTracker],
  )
  const { scope, access } = getCurrentState()
  const actionRegistry = useScopedActionRegistry(scope)
  const liveApi = useMemo(
    () => createLiveReadApi({ webBaseUrl, environment, bridge }),
    [bridge, environment, webBaseUrl],
  )
  const runtime = useMemo(
    () => createReadRuntime(liveApi, getCurrentState),
    [getCurrentState, liveApi],
  )
  const previousScope = useRef<ReadScope | null>(null)

  useEffect(() => {
    const previous = previousScope.current
    previousScope.current = scope
    if (previous && !sameScope(previous, scope)) {
      void cleanupReadQueries(queryClient, previous)
    }
  }, [queryClient, scope])

  const value = useMemo<ReadRuntimeContextValue>(
    () => ({
      actionRegistry,
      api: runtime.api,
      scope,
      getCurrentScope: () => getCurrentState().scope,
      readiness: {
        auth: auth.unavailable
          ? { kind: 'unavailable', reason: 'Authentication is unavailable.' }
          : { kind: 'configured' },
        ...liveApi.registrations,
        p5Reset: { kind: 'unavailable', reason: 'P5 reset live transport is contract-gated.' },
      },
      capabilities: {
        dashboard: can(access, requiredCapabilities.dashboard, false),
        dynamicQr: can(access, requiredCapabilities.dynamicQr, false),
        terminalLookup: can(
          access,
          requiredCapabilities.terminalLookup,
          false,
        ),
        terminalList: can(access, requiredCapabilities.terminalList, false),
        bankAccountList: can(access, requiredCapabilities.bankAccountList, false),
        cashierList: can(access, requiredCapabilities.cashierList, false),
        merchantLookup: can(access, requiredCapabilities.merchantLookup, false),
        bankAccountLookup: can(access, requiredCapabilities.bankAccountLookup, false),
        p5List: can(access, requiredCapabilities.p5List, false),
        p5ResetPin: can(access, requiredCapabilities.p5ResetPin, false),
      },
      requiredCapabilities,
      queries: runtime,
    }),
    [access, actionRegistry, auth.unavailable, getCurrentState, liveApi.registrations, runtime, scope],
  )

  return <ReadRuntimeContext value={value}>{children}</ReadRuntimeContext>
}
