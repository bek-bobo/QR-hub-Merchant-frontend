import { browserLanguages, browserLocaleStorage, readPersistedLocale, resolveLocale } from '@/shared/i18n/locale-resolution'
import { createLocaleRuntime, type LocaleRuntime } from '@/shared/i18n/runtime'

let applicationRuntime: LocaleRuntime | undefined

// Shared by LiveRoot, its integration-unavailable branch, and DEV-only roots.
// Factory injection keeps failure/recovery tests isolated from the singleton.
export async function bootstrapLocale(create = createLocaleRuntime): Promise<LocaleRuntime> {
  const storage = browserLocaleStorage()
  applicationRuntime ??= create({ storage, root: typeof document === 'undefined' ? null : document.documentElement })
  await applicationRuntime.initialize(resolveLocale({ persisted: readPersistedLocale(storage), languages: browserLanguages() }))
  // initialize handles engine failure. Rendering proceeds with legacy Uzbek UI;
  // new facade consumers receive independent emergency copy/unavailable results.
  return applicationRuntime
}
