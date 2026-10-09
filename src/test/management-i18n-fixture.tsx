import { act, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { createLocaleRuntime } from './locale-fixture'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import type { SupportedLocale } from '@/shared/i18n/registry'

export async function mountManagement(locale: SupportedLocale, children: ReactNode, prepare?: (runtime: ReturnType<typeof createLocaleRuntime>) => void) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const runtime = createLocaleRuntime({ storage: localStorage, root: document.documentElement })
  await runtime.initialize(locale)
  prepare?.(runtime)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(
    <StrictMode><LocaleProvider runtime={runtime}><ThemeProvider><MemoryRouter>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter></ThemeProvider></LocaleProvider></StrictMode>,
  ))
  return {
    host, runtime, client,
    async switchTo(next: SupportedLocale) { await act(async () => { await runtime.switchLocale(next) }) },
    async dispose() { await act(async () => root.unmount()); host.remove(); client.clear(); localStorage.clear() },
  }
}
