import { useLayoutEffect, useMemo, useState } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useProtectedReadContext, type ProtectedReadContextValue } from '@/shared/api/ProtectedReadContext'
import { createHttpTransport, validateWebBaseUrl, type HttpTransport } from '@/shared/api/http'
import { useReadRuntime, type ReadRuntimeContextValue } from './useReadRuntime'

export interface LiveWebContext {
  readonly runtime: Pick<ReadRuntimeContextValue, 'scope' | 'getCurrentScope' | 'capabilities'>
  readonly auth: ProtectedReadContextValue
  readonly queryClient: QueryClient
  readonly transport: HttpTransport | null
}

export function useCommittedGetter<T>(value: T): () => T {
  const [bridge] = useState(() => {
    let committed = value
    return { get: () => committed, set: (next: T) => { committed = next } }
  })
  useLayoutEffect(() => { bridge.set(value) })
  return bridge.get
}

// Composition only: feature permissions, evidence and wire contracts stay in
// feature adapters. Retained actions consult the latest committed dependencies.
export function useLiveWebContext() {
  const runtime = useReadRuntime()
  const auth = useProtectedReadContext()
  const queryClient = useQueryClient()
  const base = validateWebBaseUrl(import.meta.env.VITE_WEB_API_BASE_URL,
    import.meta.env.DEV ? 'development' : 'production')
  const baseUrl = base.kind === 'valid' ? base.value : null
  const transport = useMemo(() => baseUrl ? createHttpTransport({ service: 'web', baseUrl }) : null, [baseUrl])
  const current: LiveWebContext = { runtime, auth, queryClient, transport }
  // The same scoped bridge survives a form closing. A reopened form updates
  // dependencies used by its already-retained controller, including new auth
  // getters and QueryClients. This slot holds no action or outcome state.
  const bridge = runtime.actionRegistry.getOrCreate('live.web.context', () => {
    let committed = current
    return {
      get: () => committed,
      set: (next: LiveWebContext) => { committed = next },
      invalidate: () => { committed = { ...committed, transport: null } },
    }
  })
  useLayoutEffect(() => { bridge.set(current) })
  return { current, getCurrent: bridge.get }
}
