// @vitest-environment happy-dom
import { act, useLayoutEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountManagement } from '@/test/management-i18n-fixture'
import type { LoginSnapshot } from '@/shared/auth/login-controller'
import type { LoginActions } from '@/shared/auth/useAuth'
import { AuthShell } from './AuthPresentation'
import { LoginForm } from './LoginForm'

function actions(): LoginActions {
  return { startLogin: vi.fn(async () => {}), submitOtp: vi.fn(async () => {}), submitPin: vi.fn(async () => {}),
    submitNewPin: vi.fn(async () => {}), startReset: vi.fn(async () => {}), resendOtp: vi.fn(async () => {}),
    restart: vi.fn(), getOtpRemainingMs: vi.fn(() => 118000) }
}
async function enter(input: HTMLInputElement, value: string, inputType = 'insertText', caret = value.length) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.setSelectionRange(caret, caret)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }))
  })
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

it.each(['otp', 'reset-otp'] as const)('focuses %s once after the phone transition without stealing focus on timers or preferences', async phase => {
  const port = actions(), focus = vi.spyOn(HTMLInputElement.prototype, 'focus')
  let update!: (snapshot: LoginSnapshot) => void
  function Fixture() {
    const [snapshot, setSnapshot] = useState<LoginSnapshot>({ phase: 'phone', flow: 'login', pending: false })
    useLayoutEffect(() => { update = setSnapshot }, [])
    return <AuthShell><LoginForm actions={port} snapshot={snapshot} /></AuthShell>
  }
  const view = await mountManagement('uz', <Fixture />)
  try {
    expect(view.host.querySelector('#login-otp')).toBeNull()
    await act(async () => update({ phase, flow: phase === 'reset-otp' ? 'reset' : 'login', pending: false, phone: '998901234567', otpDeadlineMs: Date.now() + 118000 }))
    const input = view.host.querySelector<HTMLInputElement>('#login-otp')!
    expect(document.activeElement).toBe(input)
    expect(focus.mock.contexts.filter(node => node instanceof HTMLInputElement && node.id === 'login-otp')).toHaveLength(1)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    for (const digit of '123456') await enter(input, input.value + digit)
    expect([...view.host.querySelectorAll('.auth-otp-cells span')].map(cell => cell.textContent)).toEqual(['1','2','3','4','5','6'])
    expect(port.submitOtp).not.toHaveBeenCalled()
    for (const locale of ['ru', 'en', 'uz'] as const) {
      await view.switchTo(locale)
      expect(document.activeElement).toBe(input)
      expect(view.host.querySelector('#login-otp')).toBe(input)
      expect(input.value).toBe('123456')
    }
    const theme = view.host.querySelector<HTMLButtonElement>('.auth-header-controls > button')!
    await act(async () => { theme.focus(); theme.click() })
    expect(input.value).toBe('123456'); expect(document.activeElement).toBe(theme)
    vi.useFakeTimers()
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(document.activeElement).toBe(theme)
    expect(focus.mock.contexts.filter(node => node instanceof HTMLInputElement && node.id === 'login-otp')).toHaveLength(1)
    vi.useRealTimers()
    await act(async () => view.host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(port.submitOtp).toHaveBeenCalledExactlyOnceWith('123456')
    expect(port.resendOtp).not.toHaveBeenCalled()
  } finally { await view.dispose() }
})

describe.each(['uz','ru','en'] as const)('OTP entry in %s', locale => {
  it('accepts paste/autofill input events, sanitizes numeric digits and keeps native single-input semantics', async () => {
    const port = actions(), view = await mountManagement(locale, <AuthShell><LoginForm actions={port} snapshot={{ phase: 'otp', flow: 'login', pending: false }} /></AuthShell>)
    try {
      const input = view.host.querySelector<HTMLInputElement>('#login-otp')!
      expect(document.activeElement).toBe(input)
      expect(view.host.querySelectorAll('.auth-otp-field input')).toHaveLength(1)
      expect(view.host.querySelector('.auth-otp-cells')!.getAttribute('aria-hidden')).toBe('true')
      expect(input.getAttribute('aria-label')).toBe({uz:'Tasdiqlash kodi',ru:'Код подтверждения',en:'Verification code'}[locale])
      expect(input.autocomplete).toBe('one-time-code'); expect(input.inputMode).toBe('numeric')
      expect(input.maxLength).toBe(6); expect(input.pattern).toBe('[0-9]{6}')
      await enter(input, '123456', 'insertFromPaste')
      expect(input.value).toBe('123456')
      expect(view.host.querySelector('[data-active=true]')!.textContent).toBe('6')
      await enter(input, '12345', 'deleteContentBackward')
      expect(input.value).toBe('12345')
      expect(view.host.querySelector('[data-active=true]')!.textContent).toBe('')
      await act(async () => { input.setSelectionRange(2,2); input.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowLeft',bubbles:true})) })
      expect([...view.host.querySelectorAll('.auth-otp-cells span')].indexOf(view.host.querySelector('[data-active=true]')!)).toBe(2)
      await enter(input, '12945', 'insertText', 3)
      expect(input.value).toBe('12945')
      await enter(input, '12', 'insertFromPaste')
      expect(input.value).toBe('12')
      await enter(input, '1x2-3456789', 'insertReplacementText')
      expect(input.value).toBe('123456')
      await enter(input, 'letters', 'insertText')
      expect(input.value).toBe('')
      expect(port.submitOtp).not.toHaveBeenCalled()
    } finally { await view.dispose() }
  })
})

it('waits safely for an editable OTP stage, then focuses once and preserves pending/expiry restrictions', async () => {
  const port = actions(), focus = vi.spyOn(HTMLInputElement.prototype, 'focus')
  let update!: (snapshot: LoginSnapshot) => void
  function Fixture() {
    const [snapshot, setSnapshot] = useState<LoginSnapshot>({ phase: 'otp', flow: 'login', pending: true })
    useLayoutEffect(() => { update = setSnapshot }, [])
    return <AuthShell><LoginForm actions={port} snapshot={snapshot} /></AuthShell>
  }
  const view = await mountManagement('uz', <Fixture />)
  try {
    const input = view.host.querySelector<HTMLInputElement>('#login-otp')!
    expect(input.disabled).toBe(true); expect(document.activeElement).not.toBe(input)
    await act(async () => update({phase:'otp',flow:'login',pending:false}))
    expect(input.disabled).toBe(false); expect(document.activeElement).toBe(input)
    expect(focus.mock.contexts.filter(node => node instanceof HTMLInputElement && node.id === 'login-otp')).toHaveLength(1)
    vi.mocked(port.getOtpRemainingMs).mockReturnValue(0)
    await act(async () => update({phase:'otp',flow:'login',pending:false}))
    expect(input.disabled).toBe(true)
    expect(view.host.querySelector<HTMLButtonElement>('.auth-resend')!.disabled).toBe(false)
    await act(async () => update({phase:'blocked',flow:'login',pending:false,message:'blocked'}))
    expect(view.host.querySelector('#login-otp')).toBeNull()
    expect(port.submitOtp).not.toHaveBeenCalled(); expect(port.resendOtp).not.toHaveBeenCalled()
  } finally { await view.dispose() }
})
