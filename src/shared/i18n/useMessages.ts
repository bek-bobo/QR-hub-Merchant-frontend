import { useContext, useMemo, useSyncExternalStore } from 'react'
import { LocaleContext } from './LocaleContext'
import { createMessages, type MessageNamespace } from './messages'

export function useMessages<N extends MessageNamespace>(namespace: N) {
  const runtime = useContext(LocaleContext)
  if (!runtime) throw new Error('useMessages must be used within LocaleProvider.')
  useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
  return useMemo(() => createMessages(runtime, namespace), [runtime, namespace])
}
