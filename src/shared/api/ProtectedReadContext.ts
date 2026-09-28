import { createContext, useContext } from 'react'
import type { ProtectedReadBridge } from './protected-read'
import type { ProtectedOperation, ProtectedOperationResult, SessionSnapshot } from '@/shared/auth/session-controller'

export interface ProtectedReadContextValue {
  readonly bridge: ProtectedReadBridge
  readonly getSessionSnapshot: () => SessionSnapshot
  readonly protectedMutation: <T>(operation: ProtectedOperation<T>) => Promise<ProtectedOperationResult<T>>
}

export const ProtectedReadContext =
  createContext<ProtectedReadContextValue | null>(null)

export function useProtectedReadContext(): ProtectedReadContextValue {
  const value = useContext(ProtectedReadContext)
  if (!value) {
    throw new Error('useProtectedReadContext must be used within AuthProvider.')
  }
  return value
}
