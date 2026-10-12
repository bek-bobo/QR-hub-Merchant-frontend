import type { PropsWithChildren } from 'react'
import { I18nextProvider } from 'react-i18next'
import { LocaleContext } from './LocaleContext'
import { LocaleRecoveryNotice } from './LocaleRecoveryNotice'
import { engineForProvider, type LocaleRuntime } from './runtime'

export function LocaleProvider({ runtime, children }: PropsWithChildren<{ runtime: LocaleRuntime }>) {
  const engine = engineForProvider(runtime)
  const content = <LocaleContext.Provider value={runtime}><LocaleRecoveryNotice />{children}</LocaleContext.Provider>
  // No initialization/effects here: StrictMode cannot create engines or repeat init.
  return engine ? <I18nextProvider i18n={engine}>{content}</I18nextProvider> : content
}
