import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Button } from '@/components/ui/button'
import type { LoginSnapshot } from '@/shared/auth/login-controller'
import type { LoginActions } from '@/shared/auth/useAuth'
import { AuthShell } from './AuthPresentation'
import { LoginForm } from './LoginForm'

const capture = vi.hoisted(() => ({ buttons: [] as Array<ComponentProps<typeof Button>> }))
vi.mock('@/components/ui/button', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/button')>()
  return { ...actual, Button: (props: ComponentProps<typeof Button>) => {
    capture.buttons.push(props)
    return <actual.Button {...props} />
  } }
})
beforeEach(() => { capture.buttons = [] })

function actions(remainingMs = 73000): LoginActions {
  return { startLogin: vi.fn(async () => {}), submitOtp: vi.fn(async () => {}), submitPin: vi.fn(async () => {}),
    submitNewPin: vi.fn(async () => {}), startReset: vi.fn(async () => {}), resendOtp: vi.fn(async () => {}),
    restart: vi.fn(), getOtpRemainingMs: vi.fn(() => remainingMs) }
}

function render(phase: LoginSnapshot['phase'], port = actions(), pending = false, message?: LoginSnapshot['message']) {
  return renderToStaticMarkup(<AuthShell><LoginForm actions={port}
    snapshot={{ phase, flow: phase === 'reset-otp' ? 'reset' : 'login', phone: '998901234567', pending, message }} /></AuthShell>)
}

describe('auth flow presentation', () => {
  it.each([
    ['phone', 'Tizimga kirish', 'Davom etish'],
    ['otp', 'Tasdiqlash kodi', 'Tasdiqlash'],
    ['pin', 'PIN kiriting', 'Kirish'],
    ['set-pin', 'Yangi PIN yarating', 'PINni saqlash'],
  ] as const)('uses one brand and the real %s form in the shared shell', (phase, title, action) => {
    const html = render(phase)
    expect(html.match(/id="login-brand"/g)).toHaveLength(1)
    expect(html).toContain('Merchant boshqaruv tizimi')
    expect(html).toContain(`<h1>${title}</h1>`)
    expect(html).toContain(action)
    expect(html).toMatch(/aria-describedby="[^"]*\blogin-feedback\b[^"]*"/)
    expect(capture.buttons.filter((button) => button.type === 'submit')).toHaveLength(1)
    if (phase !== 'phone') expect(html).toContain('Telefon: +998 90 123 45 67')
  })

  it('keeps the Uzbek input and one six-digit OTP input with decorative cells', () => {
    expect(render('phone')).toContain('O‘zbekiston telefon kodi: +998.')
    const html = render('otp')
    expect(html.match(/<input\b/g)).toHaveLength(1)
    expect(html).toMatch(/autocomplete="one-time-code"/i)
    expect(html).toContain('maxLength="6"')
    expect(html).toContain('aria-label="Tasdiqlash kodi"')
    expect(html).toContain('class="auth-otp-cells" aria-hidden="true"')
    expect(html.match(/data-active=/g)).toHaveLength(6)
  })

  it.each(['otp', 'reset-otp'] as const)('uses the real timer and expiry gate in %s', (phase) => {
    const port = actions(73000)
    expect(render(phase, port)).toContain('1:13')
    expect(capture.buttons.find((button) => button.children === 'Kodni qayta yuborish')?.disabled).toBe(true)
    capture.buttons = []
    const expiredPort = actions(0)
    const html = render(phase, expiredPort)
    expect(html).toContain('0:00')
    expect(capture.buttons.find((button) => button.type === 'submit')?.disabled).toBe(true)
    const resend = capture.buttons.find((button) => button.children === 'Kodni qayta yuborish')!
    expect(resend.disabled).toBe(false)
    resend.onClick?.({} as never)
    expect(expiredPort.resendOtp).toHaveBeenCalledOnce()
  })

  it('preserves masking, autocomplete, forgot PIN and restart callbacks', () => {
    const port = actions()
    const html = render('pin', port)
    expect(html).toContain('type="password"')
    expect(html).toMatch(/autocomplete="current-password"/i)
    expect(html).toContain('aria-label="PINni ko‘rsatish"')
    capture.buttons.find((button) => button.children === 'PINni unutdingizmi?')!.onClick?.({} as never)
    expect(port.startReset).toHaveBeenCalledOnce()
    capture.buttons.find((button) => button.children === 'Qayta boshlash')!.onClick?.({} as never)
    expect(port.restart).toHaveBeenCalledOnce()
  })

  it('preserves both new PIN labels and masks both fields', () => {
    const html = render('set-pin')
    expect(html).toContain('for="new-pin"')
    expect(html).toContain('for="confirm-pin"')
    expect(html.match(/type="password"/g)).toHaveLength(2)
    expect(html).toContain('aria-label="PIN tasdig‘ini ko‘rsatish"')
  })

  it.each(['phone', 'otp', 'pin', 'set-pin'] as const)('keeps pending actions disabled and preserves feedback for %s', (phase) => {
    const html = render(phase, actions(), true, 'request')
    expect(capture.buttons.find((button) => button.type === 'submit')?.disabled).toBe(true)
    expect(html).toContain('So‘rovni yakunlab bo‘lmadi. Kirishni qayta boshlang.')
    expect(html).toContain('aria-invalid="true"')
  })
})
