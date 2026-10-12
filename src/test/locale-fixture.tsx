import { createMessages, type MessageNamespace } from '@/shared/i18n/messages'
import { StrictMode, isValidElement, type ReactNode } from 'react'
import { createRoot as createReactRoot, type RootOptions } from 'react-dom/client'
import { renderToStaticMarkup as renderReactMarkup, renderToString as renderReactString, renderToPipeableStream as renderReactStream } from 'react-dom/server'
import { createLocaleRuntime } from '@/shared/i18n/runtime'
export { createLocaleRuntime } from '@/shared/i18n/runtime'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'

export type { Root } from 'react-dom/client'

// Explicit Uzbek fixture for existing component/domain tests. It adds the same
// provider as main.tsx without changing assertions, controllers or query setup.
const uzRuntime = createLocaleRuntime()
await uzRuntime.initialize('uz')

export function renderToStaticMarkup(children: ReactNode) {
  return renderReactMarkup(<LocaleProvider runtime={uzRuntime}>{children}</LocaleProvider>)
}

export function renderToString(children: ReactNode) {
  return renderReactString(<LocaleProvider runtime={uzRuntime}>{children}</LocaleProvider>)
}

export function renderToPipeableStream(children: ReactNode, options?: Parameters<typeof renderReactStream>[1]) {
  return renderReactStream(<LocaleProvider runtime={uzRuntime}>{children}</LocaleProvider>, options)
}

export function createRoot(container: Parameters<typeof createReactRoot>[0], options?: RootOptions) {
  const root = createReactRoot(container, options)
  return {
    render: (children: ReactNode) => root.render(isValidElement<{ children: ReactNode }>(children) && children.type === StrictMode
      ? <StrictMode><LocaleProvider runtime={uzRuntime}>{children.props.children}</LocaleProvider></StrictMode>
      : <LocaleProvider runtime={uzRuntime}>{children}</LocaleProvider>),
    unmount: () => root.unmount(),
  }
}

// Existing element-level callback assertions can still inspect hook-using
// components, but execute them within a real React render/provider boundary.
export function captureWithLocale<T extends ReactNode>(render: () => T): T {
  let captured: T | undefined
  function Capture() { captured = render(); return captured }
  renderToStaticMarkup(<Capture />)
  if (captured === undefined) throw new Error('Fixture did not render')
  return captured
}

export function localeMessages<N extends MessageNamespace>(namespace: N) { return createMessages(uzRuntime, namespace) }
