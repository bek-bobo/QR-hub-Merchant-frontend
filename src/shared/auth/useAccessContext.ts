import { createContext, useContext } from 'react'
import type { AccessContextValue } from './access'

export const anonymousAccess: AccessContextValue = { kind: 'anonymous' }

export const AccessContext = createContext<AccessContextValue>(anonymousAccess)

export function useAccessContext() {
  return useContext(AccessContext)
}
