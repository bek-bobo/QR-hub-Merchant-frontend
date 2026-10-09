// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createInstance } from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocaleRuntime } from '@/shared/i18n/runtime'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import { useLocale } from '@/shared/i18n/useLocale'
import { LOCALE_STORAGE_KEY } from '@/shared/i18n/locale-resolution'
import { emergencyCopy } from '@/shared/i18n/emergency-copy'

const entry = vi.hoisted(() => ({ render: vi.fn<(node: ReactNode) => void>() }))
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: entry.render }) }))
vi.mock('@/app/LiveRoot', () => ({ LiveRoot: () => <p>Live root fixture</p> }))
vi.mock('@/dev/DemoRoot', () => ({ DemoRoot: () => <p>DEV root fixture</p> }))

beforeEach(() => { vi.resetModules(); entry.render.mockClear(); localStorage.clear(); document.body.innerHTML = '<div id="root"></div>' })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear() })

describe('shared application locale bootstrap', () => {
  it('resolves persisted preference before browser, synchronizes HTML before rendering, and reuses one runtime', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ru-RU')
    const { bootstrapLocale } = await import('./bootstrap')
    const first = await bootstrapLocale(), second = await bootstrapLocale()
    expect(first).toBe(second); expect(first.getSnapshot().locale).toBe('ru')
    expect(document.documentElement.lang).toBe('ru'); expect(document.documentElement.dir).toBe('ltr')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ru-RU')
  })

  it('renders emergency UI with children after injected engine failure', async () => {
    const engine = createInstance(); vi.spyOn(engine, 'init').mockRejectedValue(new Error('private initialization detail'))
    const { bootstrapLocale } = await import('./bootstrap')
    const runtime = await bootstrapLocale((options) => createLocaleRuntime({ ...options, engine }))
    expect(runtime.getSnapshot().ready).toBe(false)
    const html = renderToStaticMarkup(<LocaleProvider runtime={runtime}><p>Legacy child</p></LocaleProvider>)
    expect(html).toContain(emergencyCopy.section); expect(html).toContain('Legacy child')
    expect(html).not.toContain('initialization detail')
  })

  it.each([['production', false, 'demo', 'Live root fixture'], ['development live', true, 'live', 'Live root fixture'], ['development demo', true, 'demo', 'DEV root fixture']] as const)(
    'initializes before the %s entry renders', async (_name, development, mode, expected) => {
      vi.stubEnv('DEV', development); vi.stubEnv('VITE_APP_MODE', mode)
      localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
      await import('@/main')
      await vi.waitFor(() => expect(entry.render).toHaveBeenCalledOnce())
      expect(document.documentElement.lang).toBe('en')
      const html = renderToStaticMarkup(entry.render.mock.calls[0][0])
      expect(html).toContain(expected)
      expect(html).not.toContain(emergencyCopy.section)
    },
  )

  it('provides a stable locale to DEV-like children even when persistence is malformed', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, '{broken JSON')
    vi.stubGlobal('navigator', { languages: ['uz-Cyrl', 'ru-RU'] })
    const { bootstrapLocale } = await import('./bootstrap')
    const runtime = await bootstrapLocale()
    function Probe() { return <p>{useLocale().locale}</p> }
    expect(renderToStaticMarkup(<LocaleProvider runtime={runtime}><Probe /></LocaleProvider>)).toContain('<p>ru</p>')
  })
})
