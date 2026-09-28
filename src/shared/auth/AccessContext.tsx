import type { ReactNode } from 'react'
import type { AccessContextValue } from './access'
import { AccessContext, anonymousAccess } from './useAccessContext'

interface AccessProviderProps {
  children: ReactNode
  value?: AccessContextValue
}

export function AccessProvider({
  children,
  value = anonymousAccess,
}: AccessProviderProps) {
  return <AccessContext value={value}>{children}</AccessContext>
}
