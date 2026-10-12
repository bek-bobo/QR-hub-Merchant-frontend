import { emergencyCopy } from './emergency-copy'
import { useLocale } from './useLocale'

export function LocaleRecoveryNotice() {
  const { ready } = useLocale()
  return ready ? null : <p role="alert">{emergencyCopy.section}</p>
}
