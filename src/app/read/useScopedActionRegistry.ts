import { useEffect, useRef, useState } from 'react'
import { createActionRegistry } from '@/shared/api/one-dispatch-action'
import type { ReadScope } from '@/shared/contracts/merchant-read'

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source &&
    left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

export function useScopedActionRegistry(scope: ReadScope) {
  const [registry] = useState(createActionRegistry)
  const previousScope = useRef(scope)

  useEffect(() => {
    if (!sameScope(previousScope.current, scope)) registry.invalidateAll()
    previousScope.current = scope
  }, [registry, scope])

  useEffect(() => () => registry.invalidateAll(), [registry])

  return registry
}
