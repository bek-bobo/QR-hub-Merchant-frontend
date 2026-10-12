// @vitest-environment happy-dom
import { act, useSyncExternalStore } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountManagement } from '@/test/management-i18n-fixture'
import { deferred, makeAuthApi } from '@/test/auth-fakes'
import { createMessages } from '@/shared/i18n/messages'
import { LoginController } from '@/shared/auth/login-controller'
import type { LoginActions } from '@/shared/auth/useAuth'
import { AuthShell } from './AuthPresentation'
import { LoginForm } from './LoginForm'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('qrhub:theme:v1', 'light')
})
function actions(): LoginActions {
  return { startLogin: vi.fn(async () => {}), submitOtp: vi.fn(async () => {}), submitPin: vi.fn(async () => {}),
    submitNewPin: vi.fn(async () => {}), startReset: vi.fn(async () => {}), resendOtp: vi.fn(async () => {}),
    restart: vi.fn(), getOtpRemainingMs: vi.fn(() => 73000) }
}
function controls(host: HTMLElement) {
  const group = host.querySelector<HTMLElement>('.auth-header-controls')!
  return { group, theme: group.firstElementChild as HTMLButtonElement, locale: group.querySelector<HTMLButtonElement>('[data-locale-trigger]')! }
}
async function selectLocale(trigger: HTMLButtonElement, locale: 'uz' | 'ru' | 'en') {
  await act(async () => { trigger.focus(); trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
  const option = document.querySelector<HTMLElement>(`[role=menuitemradio][lang=${locale}]`)!
  expect(option).not.toBeNull()
  await act(async () => option.click())
}
describe.each(['uz', 'ru', 'en'] as const)('auth header controls in %s', locale => {
  it('renders one selector outside the centered composition, after the theme control and decorative divider', async () => {
    const port = actions(), view = await mountManagement(locale, <AuthShell><LoginForm actions={port} snapshot={{ phase: 'phone', flow: 'login', pending: false }} /></AuthShell>)
    try {
      const { group, theme, locale: selector } = controls(view.host)
      const messages = createMessages(view.runtime, 'common')
      expect(view.host.querySelectorAll('[data-locale-trigger]')).toHaveLength(1)
      expect(view.host.querySelector('.auth-composition [data-locale-trigger]')).toBeNull()
      expect(group.children).toHaveLength(3)
      expect(group.children[1].className).toBe('auth-header-divider')
      expect(group.children[1].getAttribute('aria-hidden')).toBe('true')
      expect(group.children[2].contains(selector)).toBe(true)
      expect(theme.getAttribute('aria-label')).toBe(messages.message('theme.next', { label: messages.message('theme.light') }))
      expect(selector.getAttribute('aria-label')).toBe(messages.message('locale.label'))
      expect(theme.className).toContain('focus-visible:ring-3')
      expect(selector.className).toContain('focus-visible:ring-2')
      await act(async () => { theme.focus(); theme.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); theme.click() })
      expect(localStorage.getItem('qrhub:theme:v1')).toBe('dark')
      await act(async () => { selector.focus(); selector.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
      expect(document.querySelectorAll('[role=menuitemradio]')).toHaveLength(3)
      await act(async () => document.querySelector('[role=menuitemradio]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
      await vi.waitFor(() => expect(document.querySelector('[role=menu]')).toBeNull())
      await vi.waitFor(() => expect(document.activeElement).toBe(selector))
      expect(port.startLogin).not.toHaveBeenCalled()
      expect(view.host.textContent).not.toMatch(/theme\.next|locale\.label|brand\.subtitle/)
    } finally { await view.dispose() }
  })
})

it.each(['phone', 'otp', 'reset-otp', 'pin', 'set-pin'] as const)('keeps %s drafts, form identity and countdown across theme and locale changes', async phase => {
  const port = actions(), view = await mountManagement('uz', <AuthShell><LoginForm actions={port} snapshot={{ phase, flow: phase === 'reset-otp' ? 'reset' : 'login', pending: false, phone: '998901234567', otpDeadlineMs: 74000 }} /></AuthShell>)
  try {
    const form = view.host.querySelector('form'), fields = [...view.host.querySelectorAll<HTMLInputElement>('input')]
    await act(async () => fields.forEach(field => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, phase === 'phone' ? '90 123 45 67' : phase.includes('otp') ? '001234' : '1234')
      field.dispatchEvent(new Event('input', { bubbles: true }))
    }))
    const drafts = fields.map(field => field.value), { theme, locale } = controls(view.host)
    const cached = view.client.getQueryCache()
    for (const target of ['ru', 'en', 'uz'] as const) {
      await act(async () => theme.click())
      const selectedTheme = localStorage.getItem('qrhub:theme:v1')
      await selectLocale(locale, target)
      expect(localStorage.getItem('qrhub:theme:v1')).toBe(selectedTheme)
      expect(localStorage.getItem('qrhub:locale:v1')).toBe(target)
      expect(view.host.querySelector('form')).toBe(form)
      expect([...view.host.querySelectorAll('input')]).toEqual(fields)
      expect(fields.map(field => field.value)).toEqual(drafts)
      expect(view.client.getQueryCache()).toBe(cached)
      if (phase.includes('otp')) expect(view.host.textContent).toContain('1:13')
    }
    expect(localStorage.getItem('qrhub:theme:v1')).toBe('light')
    for (const [name, operation] of Object.entries(port)) if (name !== 'getOtpRemainingMs') expect(operation).not.toHaveBeenCalled()
  } finally { await view.dispose() }
})

it('uses OS preference in system mode and restores independently persisted selections on a fresh provider mount', async () => {
  let dark = true
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ get matches() { return dark },
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => { listeners.add(listener) },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => { listeners.delete(listener) },
  }) as MediaQueryList)
  const view = await mountManagement('uz', <AuthShell><div>Recovery</div></AuthShell>)
  let restored: Awaited<ReturnType<typeof mountManagement>> | undefined
  try {
    const { theme, locale } = controls(view.host)
    await act(async () => { theme.click() })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await act(async () => theme.click())
    expect(localStorage.getItem('qrhub:theme:v1')).toBe('system')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await act(async () => { dark = false; listeners.forEach(listener => listener({ matches: false } as MediaQueryListEvent)) })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    await selectLocale(locale, 'ru')
    expect(localStorage.getItem('qrhub:theme:v1')).toBe('system')
    restored = await mountManagement('ru', <AuthShell><div>Next auth stage</div></AuthShell>)
    expect(controls(restored.host).theme.querySelector('svg.lucide-monitor')).not.toBeNull()
    expect(controls(restored.host).locale.textContent).toBe('RU')
    expect(localStorage.getItem('qrhub:locale:v1')).toBe('ru')
  } finally { await restored?.dispose(); await view.dispose(); vi.restoreAllMocks() }
})

it('preserves one pending auth command, lease, session and OTP deadline while operating both header controls', async () => {
  const response = deferred<{ stage: 'otp'; otpId: string; expiresInSeconds: number }>()
  const api = makeAuthApi({ createSession: vi.fn().mockResolvedValue({ sessionKey: 'synthetic-session', reply: { stage: 'otp' } }), sendOtp: vi.fn(() => response.promise) })
  const lease = { acquire: vi.fn(async () => ({ status: 'acquired' as const, deviceUuid: 'synthetic-device' })), release: vi.fn() }
  const session = { establishSession: vi.fn() }
  const controller = new LoginController({ api, lease, session, now: () => 1000 })
  function Fixture() { return <AuthShell><LoginForm actions={controller} snapshot={useSyncExternalStore(controller.subscribe, controller.getSnapshot)} /></AuthShell> }
  const view = await mountManagement('uz', <Fixture />)
  try {
    let flight!: Promise<void>
    await act(async () => { flight = controller.startLogin('998901234567'); await new Promise(resolve => setTimeout(resolve, 0)) })
    const snapshot = controller.getSnapshot(), signal = vi.mocked(api.sendOtp).mock.calls[0][2]?.signal
    const form = view.host.querySelector('form'), { theme, locale } = controls(view.host)
    await act(async () => theme.click())
    await selectLocale(locale, 'ru')
    await act(async () => theme.click())
    await selectLocale(locale, 'en')
    expect(controller.getSnapshot()).toBe(snapshot)
    expect(view.host.querySelector('form')).toBe(form)
    expect(view.host.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true)
    expect(api.createSession).toHaveBeenCalledOnce(); expect(api.sendOtp).toHaveBeenCalledOnce()
    expect(vi.mocked(api.sendOtp).mock.calls[0][2]?.signal).toBe(signal)
    expect(signal?.aborted).toBe(false)
    expect(lease.acquire).toHaveBeenCalledOnce(); expect(lease.release).not.toHaveBeenCalled()
    expect(session.establishSession).not.toHaveBeenCalled()
    await act(async () => { response.resolve({ stage: 'otp', otpId: 'synthetic-otp', expiresInSeconds: 73 }); await flight })
    expect(controller.getSnapshot()).toMatchObject({ phase: 'otp', pending: false, otpDeadlineMs: 74000 })
    expect(view.host.textContent).toContain('1:13')
  } finally { controller.dispose(); await view.dispose() }
})
