import { useContext, useSyncExternalStore } from 'react'
import { LocaleContext } from './LocaleContext'

export function useLocale() {
  const runtime = useContext(LocaleContext)
  if (!runtime) throw new Error('useLocale must be used within LocaleProvider.')
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
  return { ...snapshot, switchLocale: runtime.switchLocale }
}
