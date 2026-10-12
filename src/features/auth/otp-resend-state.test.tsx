// @vitest-environment happy-dom
import { act, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { mountManagement } from '@/test/management-i18n-fixture'
import { deferred, makeAuthApi } from '@/test/auth-fakes'
import { safeBusinessError } from '@/shared/api/errors'
import { LoginController } from '@/shared/auth/login-controller'
import type { LoginActions } from '@/shared/auth/useAuth'
import { AuthShell } from './AuthPresentation'
import { LoginForm } from './LoginForm'

const labels = { uz: 'Kodni qayta yuborish', ru: 'Отправить код повторно', en: 'Resend code' }
function actions(remaining: () => number): LoginActions {
  return { startLogin: vi.fn(async () => {}), submitOtp: vi.fn(async () => {}), submitPin: vi.fn(async () => {}),
    submitNewPin: vi.fn(async () => {}), startReset: vi.fn(async () => {}), resendOtp: vi.fn(async () => {}),
    restart: vi.fn(), getOtpRemainingMs: remaining }
}
describe.each(['uz', 'ru', 'en'] as const)('OTP resend presentation in %s', locale => {
  it.each(['otp', 'reset-otp'] as const)('follows existing %s eligibility through countdown, pending, locale and theme changes', async phase => {
    localStorage.clear(); localStorage.setItem('qrhub:theme:v1', 'light')
    let remaining = 118000
    const port = actions(() => remaining)
    let repaint!: () => void, setPending!: (pending: boolean) => void
    function Fixture() {
      const [, update] = useState(0), [pending, updatePending] = useState(false)
      useLayoutEffect(() => {
        repaint = () => update(value => value + 1); setPending = updatePending
      }, [update, updatePending])
      return <AuthShell><LoginForm actions={port} snapshot={{ phase, flow: phase === 'reset-otp' ? 'reset' : 'login', pending, phone: '998901234567', otpDeadlineMs: 74000 }} /></AuthShell>
    }
    const view = await mountManagement(locale, <Fixture />)
    try {
      const button = view.host.querySelector<HTMLButtonElement>('.auth-resend')!
      expect(button.textContent?.trim()).toBe(labels[locale])
      expect(button.classList.contains('auth-secondary')).toBe(true)
      expect(button.querySelector('svg.lucide-refresh-cw')?.getAttribute('aria-hidden')).toBe('true')
      expect(button.disabled).toBe(true); expect(button.matches(':disabled')).toBe(true)
      expect(view.host.textContent).toContain('1:58')
      await act(async () => button.click())
      expect(port.resendOtp).not.toHaveBeenCalled()
      await act(async () => { remaining = 0; repaint() })
      expect(view.host.querySelector('.auth-resend')).toBe(button)
      expect(view.host.textContent).toContain('0:00')
      expect(button.disabled).toBe(false); expect(button.matches(':not(:disabled)')).toBe(true)
      expect(button.classList.contains('auth-resend')).toBe(true)
      expect(button.className).toContain('focus-visible:ring-3')
      for (const next of ['uz', 'ru', 'en'] as const) {
        await view.switchTo(next)
        expect(button.textContent?.trim()).toBe(labels[next])
        expect(button.disabled).toBe(false)
        await act(async () => view.host.querySelector<HTMLButtonElement>('.auth-header-controls > button')!.click())
        expect(button.disabled).toBe(false)
      }
      await act(async () => { button.focus(); button.click() })
      expect(port.resendOtp).toHaveBeenCalledExactlyOnceWith()
      await act(async () => setPending(true))
      expect(view.host.textContent).toContain('0:00')
      expect(button.disabled).toBe(true)
      await act(async () => button.click())
      await view.switchTo('ru')
      await act(async () => view.host.querySelector<HTMLButtonElement>('.auth-header-controls > button')!.click())
      expect(button.disabled).toBe(true)
      expect(port.resendOtp).toHaveBeenCalledOnce()
    } finally { await view.dispose() }
  })
})

it('preserves controller single-request safety and terminal rate-limit handling after expiry', async () => {
  let now = 1000
  const reply = deferred<{ stage: 'otp'; otpId: string; expiresInSeconds: number }>()
  const resend = vi.fn(() => reply.promise)
  const api = makeAuthApi({ createSession: vi.fn().mockResolvedValue({ sessionKey: 'synthetic-session', reply: { stage: 'otp' } }),
    sendOtp: vi.fn().mockResolvedValue({ stage: 'otp', otpId: 'synthetic-otp', expiresInSeconds: 60 }), resendOtp: resend })
  const controller = new LoginController({ api, now: () => now,
    lease: { acquire: vi.fn(async () => ({ status: 'acquired' as const, deviceUuid: 'synthetic-device' })), release: vi.fn() },
    session: { establishSession: vi.fn() },
  })
  await controller.startLogin('998901234567'); now = 62000
  function Fixture() { return <AuthShell><LoginForm actions={controller} snapshot={useSyncExternalStore(controller.subscribe, controller.getSnapshot)} /></AuthShell> }
  const view = await mountManagement('uz', <Fixture />)
  try {
    const button = view.host.querySelector<HTMLButtonElement>('.auth-resend')!
    expect(button.disabled).toBe(false)
    await act(async () => button.click())
    expect(button.disabled).toBe(true); expect(view.host.textContent).toContain('0:00')
    await act(async () => button.click())
    expect(resend).toHaveBeenCalledOnce()
    await act(async () => { reply.reject(safeBusinessError({ tag: 'RATE_LIMIT_EXCEEDED' })); await new Promise(resolve => setTimeout(resolve, 0)) })
    expect(controller.getSnapshot()).toMatchObject({ phase: 'error', message: 'rateLimited', pending: false })
    expect(view.host.querySelector('.auth-resend')).toBeNull()
    await view.switchTo('ru')
    await act(async () => view.host.querySelector<HTMLButtonElement>('.auth-header-controls > button')!.click())
    expect(view.host.querySelector('.auth-resend')).toBeNull()
    await controller.resendOtp()
    expect(resend).toHaveBeenCalledOnce()
  } finally { controller.dispose(); await view.dispose() }
})
