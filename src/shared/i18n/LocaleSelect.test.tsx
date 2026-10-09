// @vitest-environment happy-dom
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createInstance } from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from './LocaleProvider'
import { LocaleSelect } from './LocaleSelect'
import { createLocaleRuntime, type LocaleRuntime } from './runtime'
import { languageRegistry, supportedLocales, type SupportedLocale } from './registry'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'

const mounted: { root: Root; host: HTMLElement }[] = []
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear()
})
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await act(async () => root.unmount()); host.remove() }
  vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear()
})
async function flush() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) }) }
async function mount(locale: SupportedLocale = 'uz', mode = 'light', supplied?: LocaleRuntime) {
  localStorage.setItem('qrhub:theme:v1', mode)
  const engine = createInstance()
  const runtime = supplied ?? createLocaleRuntime({ engine, storage: localStorage, root: document.documentElement })
  if (!supplied) await runtime.initialize(locale)
  const service = vi.spyOn(runtime, 'switchLocale')
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host); mounted.push({ root, host })
  await act(async () => root.render(<StrictMode><LocaleProvider runtime={runtime}><ThemeProvider><LocaleSelect /></ThemeProvider></LocaleProvider></StrictMode>))
  const trigger = host.querySelector<HTMLButtonElement>('[data-locale-trigger]')!
  return { host, trigger, runtime, engine, service }
}
async function key(element: Element, value: string) {
  await act(async () => element.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })))
  await flush()
}
async function open(trigger: HTMLButtonElement) { trigger.focus(); await key(trigger, 'Enter') }
function options() { return [...document.querySelectorAll<HTMLElement>('[role=menuitemradio]')] }
async function choose(code: SupportedLocale) {
  await act(async () => options().find((item) => item.lang === code)!.click())
  await flush()
}

describe('shared locale pill and Radix dropdown', () => {
  it('shows the canonical default, icons and full selected language description', async () => {
    const { host, trigger } = await mount()
    expect(trigger.textContent).toBe('O‘Z')
    expect(trigger.getAttribute('aria-label')).toBe('Til')
    expect(trigger.querySelector('.lucide-globe')).not.toBeNull()
    expect(trigger.querySelector('.lucide-chevron-down')).not.toBeNull()
    expect(document.getElementById(trigger.getAttribute('aria-describedby')!)?.textContent).toContain('O‘zbekcha')
    expect(host.querySelector('select')).toBeNull()
    expect(document.querySelector('[role=menu]')).toBeNull()
  })
  it.each(['uz', 'ru', 'en'] as const)('derives enabled options and checked highlight from canonical %s', async (locale) => {
    const { trigger, host } = await mount(locale)
    await open(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(options().map((item) => item.lang)).toEqual(supportedLocales)
    expect(options().map((item) => item.getAttribute('aria-label'))).toEqual(supportedLocales.map((code) => languageRegistry[code].nativeName))
    expect(options().map((item) => item.textContent)).toEqual(['O‘Z', 'RU', 'EN'])
    const checked = options().filter((item) => item.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1); expect(checked[0].lang).toBe(locale)
    expect(checked[0].className).toContain('data-[state=checked]:bg-brand-soft')
    expect(checked[0].querySelector('.lucide-check')).not.toBeNull()
    expect(document.querySelectorAll('[role=menuitemradio] .lucide-check')).toHaveLength(1)
    expect(host.querySelector('[role=menu]')).toBeNull() // Portal prevents header clipping.
  })
  it('navigates by keyboard, switches once, closes and restores trigger focus', async () => {
    const { trigger, runtime, engine, service } = await mount()
    const change = vi.spyOn(engine, 'changeLanguage')
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const beforeUrl = window.location.href
    await open(trigger)
    await key(document.querySelector('[role=menu]')!, 'ArrowDown')
    expect(document.activeElement).toBe(options()[0])
    await key(options()[0], 'ArrowDown')
    expect(document.activeElement).toBe(options()[1])
    await key(options()[1], 'Enter')
    expect(runtime.getSnapshot().locale).toBe('ru'); expect(trigger.textContent).toBe('RU')
    expect(service).toHaveBeenCalledExactlyOnceWith('ru'); expect(change).toHaveBeenCalledExactlyOnceWith('ru')
    expect(localStorage.getItem('qrhub:locale:v1')).toBe('ru')
    expect(document.documentElement.lang).toBe('ru'); expect(document.documentElement.dir).toBe('ltr')
    expect(document.querySelector('[role=menu]')).toBeNull(); expect(document.activeElement).toBe(trigger)
    expect(window.location.href).toBe(beforeUrl); expect(fetch).not.toHaveBeenCalled()
    expect(document.querySelector('[data-locale-trigger]')).toBe(trigger)
  })
  it('closes the current selection without calling the service or engine', async () => {
    const { trigger, engine, service } = await mount('en')
    const change = vi.spyOn(engine, 'changeLanguage')
    await open(trigger); await choose('en')
    expect(trigger.textContent).toBe('EN'); expect(service).not.toHaveBeenCalled(); expect(change).not.toHaveBeenCalled()
    expect(document.querySelector('[role=menu]')).toBeNull(); expect(document.activeElement).toBe(trigger)
  })
  it('dismisses with Escape and restores focus', async () => {
    const { trigger } = await mount()
    await open(trigger); await key(document.querySelector('[role=menu]')!, 'Escape')
    expect(document.querySelector('[role=menu]')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false'); expect(document.activeElement).toBe(trigger)
  })
  it('dismisses on an outside pointer press', async () => {
    const { trigger } = await mount()
    await open(trigger)
    await act(async () => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 })))
    await flush()
    expect(document.querySelector('[role=menu]')).toBeNull(); expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
  it('keeps the prior locale, persistence and guarded error when switching fails', async () => {
    const { trigger, host, engine, runtime } = await mount()
    engine.removeResourceBundle('ru', 'auth')
    await open(trigger); await choose('ru')
    expect(runtime.getSnapshot().locale).toBe('uz'); expect(trigger.textContent).toBe('O‘Z')
    expect(document.activeElement).toBe(trigger); expect(localStorage.getItem('qrhub:locale:v1')).not.toBe('ru')
    expect(host.querySelector('[role=alert]')?.textContent).toContain('Tilni o‘zgartirib bo‘lmadi.')
    await open(trigger); expect(options().find((item) => item.lang === 'uz')?.getAttribute('aria-checked')).toBe('true')
  })
  it('blocks duplicate selections while the existing service is pending', async () => {
    const { trigger, service } = await mount()
    let finish!: (value: { status: 'failed'; text: string }) => void
    service.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    await open(trigger); await choose('ru')
    expect(trigger.getAttribute('aria-busy')).toBe('true')
    await open(trigger)
    expect(options().every((item) => item.hasAttribute('data-disabled'))).toBe(true)
    await choose('en'); expect(service).toHaveBeenCalledOnce()
    await act(async () => finish({ status: 'failed', text: 'private detail' }))
    expect(trigger.getAttribute('aria-busy')).toBe('false')
    expect(document.body.textContent).not.toContain('private detail')
  })
  it.each(['light', 'dark'])('works within the existing %s theme without changing it', async (mode) => {
    const { trigger } = await mount('en', mode)
    await open(trigger); await choose('ru')
    expect(document.documentElement.classList.contains('dark')).toBe(mode === 'dark')
    expect(localStorage.getItem('qrhub:theme:v1')).toBe(mode)
    expect(trigger.className).toContain('focus-visible:ring-2')
  })
  it('keeps an unready recovery selector disabled', async () => {
    const engine = createInstance(); vi.spyOn(engine, 'init').mockRejectedValue(new Error('private error'))
    const runtime = createLocaleRuntime({ engine }); await runtime.initialize()
    const { trigger } = await mount('uz', 'light', runtime)
    expect(trigger.disabled).toBe(true); expect(document.querySelector('[role=menu]')).toBeNull()
    expect(document.body.textContent).not.toContain('private error')
  })
})
