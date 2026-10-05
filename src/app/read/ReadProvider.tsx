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
import { createHttpTransport, validateWebBaseUrl, type RuntimeEnvironment } from '@/shared/api/http'
import { createLiveP5ResetPort } from '@/features/p5/p5-reset'
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
  const { bridge, getSessionSnapshot, protectedMutation } = useProtectedReadContext()
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
  const resetBase = validateWebBaseUrl(webBaseUrl, environment)
  const resetBaseUrl = resetBase.kind === 'valid' ? resetBase.value : null
  const p5ResetPort = useMemo(() => {
    if (!resetBaseUrl) return null
    const transport = createHttpTransport({ service: 'web', baseUrl: resetBaseUrl })
    return createLiveP5ResetPort({
      transport, protectedMutation,
      recheck: (_request, requestedScope) => {
        const current = getCurrentState()
        return sameScope(requestedScope, current.scope) &&
          can(current.access, 'p5.read', false) && can(current.access, 'p5.resetPin', false)
      },
    })
  }, [getCurrentState, protectedMutation, resetBaseUrl])
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
      p5ResetPort,
      api: runtime.api,
      scope,
      getCurrentScope: () => getCurrentState().scope,
      readiness: {
        auth: auth.unavailable
          ? { kind: 'unavailable', reason: 'Authentication is unavailable.' }
          : { kind: 'configured' },
        ...liveApi.registrations,
        p5Reset: p5ResetPort ? { kind: 'configured' } : { kind: 'unavailable', reason: 'P5 reset transport is unavailable.' },
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
    [access, actionRegistry, p5ResetPort, auth.unavailable, getCurrentState, liveApi.registrations, runtime, scope],
  )

  return <ReadRuntimeContext value={value}>{children}</ReadRuntimeContext>
}
