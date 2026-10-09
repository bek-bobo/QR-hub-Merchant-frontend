// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { createInstance } from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Header } from './layout/Header'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import { createLocaleRuntime } from '@/shared/i18n/runtime'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { QrPresentation } from '@/features/dynamic-qr/QrPresentation'
import { validateCreateLink } from '@/features/dynamic-qr/create-result'

vi.mock('@/features/dynamic-qr/BrandedQrPoster', () => ({ BrandedQrPoster: ({ validatedLink }: { validatedLink: { original: string } }) => <div data-payload={validatedLink.original} /> }))
const mounted: { root: Root; host: HTMLElement }[] = []
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }) })
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await act(async () => root.unmount()); host.remove() }
  vi.restoreAllMocks()
})
async function mount(content: React.ReactNode) {
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host); mounted.push({ root, host })
  await act(async () => root.render(content))
  return host
}
describe('I18N.6 confirmed runtime defects', () => {
  it('disables visible noncompact logout and blocks dispatch after essential copy disappears', async () => {
    const engine = createInstance(), runtime = createLocaleRuntime({ engine }), logout = vi.fn()
    await runtime.initialize('ru')
    engine.addResource('ru', 'auth', 'actions.logout', '')
    engine.addResource('uz', 'auth', 'actions.logout', '')
    const host = await mount(<LocaleProvider runtime={runtime}><ThemeProvider><MemoryRouter><Header onLogout={logout} /></MemoryRouter></ThemeProvider></LocaleProvider>)
    const button = [...host.querySelectorAll('button')].at(-1)!
    expect(button.disabled).toBe(true)
    expect(button.textContent).not.toContain('actions.logout')
    await act(async () => button.click())
    expect(logout).not.toHaveBeenCalled()
  })
  it('renders keyed QR siblings without warnings across locale and link changes, preserving the exact payload', async () => {
    const runtime = createLocaleRuntime(); await runtime.initialize()
    const error = vi.spyOn(console, 'error'), warning = vi.spyOn(console, 'warn')
    const original = 'https://qrhub.uz/Exact/%2fPath?case=MiXeD#Part%2FOne'
    const next = 'https://qrhub.uz/Next%2FPath?Case=Keep'
    const content = (link: string) => <LocaleProvider runtime={runtime}><QrPresentation qrId="opaque-001" terminalName="Backend name" link={validateCreateLink(link)} unavailableMessage="Caller data" /></LocaleProvider>
    const host = await mount(content(original))
    for (const locale of ['ru', 'en', 'uz'] as const) {
      await act(async () => { await runtime.switchLocale(locale) })
      expect(host.querySelector('[data-payload]')?.getAttribute('data-payload')).toBe(original)
    }
    await act(async () => mounted[0].root.render(content(next)))
    expect(host.querySelector('[data-payload]')?.getAttribute('data-payload')).toBe(next)
    expect([...error.mock.calls, ...warning.mock.calls].flat().join(' ')).not.toMatch(/same key|unique.*key/i)
  })
})
