import { describe, expect, it, vi } from 'vitest'
import type { AuthApi } from '@/shared/api/auth-api'
import { safeBusinessError } from '@/shared/api/errors'
import { LoginController, type LoginOwnerLease } from './login-controller'
import type { LoginSessionPort } from './login-controller'
import { SessionController } from './session-controller'
import type { StageReply } from './model'
import {
  deferred,
  makeAuthApi,
  syntheticPairA,
  syntheticProfileA,
} from '@/test/auth-fakes'

const acquiredLeaseResult = {
  status: 'acquired',
  deviceUuid: '00000000-0000-4000-8000-000000000001',
} as const

function setup(
  overrides: Partial<AuthApi> = {},
  startNow = 1_000,
) {
  let now = startNow
  const lease: LoginOwnerLease = {
    acquire: vi.fn().mockResolvedValue(acquiredLeaseResult),
    release: vi.fn(),
  }
  const session: LoginSessionPort = {
    establishSession: vi.fn().mockResolvedValue({
      status: 'authenticated',
      profile: syntheticProfileA,
      sessionScopeId: 'test-scope',
    }),
  }
  const api = makeAuthApi({
    createSession: vi.fn().mockResolvedValue({
      sessionKey: 'test-session',
      reply: { stage: 'otp' },
    }),
    sendOtp: vi.fn().mockResolvedValue({
      stage: 'otp',
      otpId: 'test-otp-a',
      expiresInSeconds: 60,
    }),
    resendOtp: vi.fn().mockResolvedValue({
      stage: 'otp',
      otpId: 'test-otp-b',
      expiresInSeconds: 60,
    }),
    verifyOtp: vi.fn().mockResolvedValue({ stage: 'set-pin' }),
    setPin: vi.fn().mockResolvedValue({ stage: 'pin' }),
    checkPin: vi.fn().mockResolvedValue({
      stage: 'done',
      tokenPair: syntheticPairA,
    }),
    resetSendOtp: vi.fn().mockResolvedValue({
      stage: 'reset-otp',
      otpId: 'test-reset-otp-a',
      expiresInSeconds: 60,
    }),
    resetResendOtp: vi.fn().mockResolvedValue({
      stage: 'reset-otp',
      otpId: 'test-reset-otp-b',
      expiresInSeconds: 60,
    }),
    resetVerifyOtp: vi.fn().mockResolvedValue({ stage: 'set-pin' }),
    resetSetPin: vi.fn().mockResolvedValue({ stage: 'pin' }),
    ...overrides,
  })
  const controller = new LoginController({
    api,
    lease,
    session,
    now: () => now,
  })
  return {
    api,
    controller,
    lease,
    session,
    setNow: (value: number) => {
      now = value
    },
  }
}

describe('login controller', () => {
  it('routes a known device directly to PIN without OTP verification', async () => {
    const sendOtp = vi.fn().mockResolvedValue({ stage: 'pin' })
    const verifyOtp = vi.fn<AuthApi['verifyOtp']>()
    const { controller } = setup({ sendOtp, verifyOtp })

    await controller.startLogin('998901234567')

    expect(sendOtp).toHaveBeenCalledWith(
      'test-session',
      '998901234567',
      expect.any(Object),
    )
    expect(controller.getSnapshot().phase).toBe('pin')
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('requires set-PIN then check-PIN before session bootstrap', async () => {
    const { controller, session } = setup()

    await controller.startLogin('998901234567')
    await controller.submitOtp('001234')
    expect(controller.getSnapshot().phase).toBe('set-pin')

    await controller.submitNewPin('0012', '0012')
    expect(controller.getSnapshot().phase).toBe('pin')
    expect(session.establishSession).not.toHaveBeenCalled()

    await controller.submitPin('0012')
    expect(session.establishSession).toHaveBeenCalledTimes(1)
    expect(controller.getSnapshot().phase).toBe('complete')
  })

  it('runs get-me through the real session bootstrap only after check-PIN', async () => {
    const getMe = vi.fn().mockResolvedValue(syntheticProfileA)
    const api = makeAuthApi({
      createSession: vi.fn().mockResolvedValue({
        sessionKey: 'test-session',
        reply: { stage: 'otp' },
      }),
      sendOtp: vi.fn().mockResolvedValue({
        stage: 'otp',
        otpId: 'test-otp-a',
        expiresInSeconds: 60,
      }),
      verifyOtp: vi.fn().mockResolvedValue({ stage: 'set-pin' }),
      setPin: vi.fn().mockResolvedValue({ stage: 'pin' }),
      checkPin: vi.fn().mockResolvedValue({
        stage: 'done',
        tokenPair: syntheticPairA,
      }),
      getMe,
    })
    const lease: LoginOwnerLease = {
      acquire: vi.fn().mockResolvedValue(acquiredLeaseResult),
      release: vi.fn(),
    }
    const session = new SessionController({
      api,
      cache: { cancel: vi.fn(), clear: vi.fn() },
      now: () => 1_000,
      generateScopeId: () => 'test-scope',
    })
    const controller = new LoginController({
      api,
      lease,
      session,
      now: () => 1_000,
    })

    await controller.startLogin('998901234567')
    await controller.submitOtp('001234')
    await controller.submitNewPin('0012', '0012')
    expect(getMe).not.toHaveBeenCalled()

    await controller.submitPin('0012')

    expect(getMe).toHaveBeenCalledTimes(1)
    expect(session.getSnapshot().phase).toBe('authenticated')
    expect(controller.getSnapshot().phase).toBe('complete')
  })

  it('does not send set-PIN when confirmation differs', async () => {
    const setPin = vi.fn<AuthApi['setPin']>()
    const { controller } = setup({ setPin })
    await controller.startLogin('998901234567')
    await controller.submitOtp('001234')

    await controller.submitNewPin('0012', '0013')

    expect(setPin).not.toHaveBeenCalled()
    expect(controller.getSnapshot().phase).toBe('set-pin')
  })

  it('keeps reset endpoints distinct and requires check-PIN afterward', async () => {
    const sendOtp = vi.fn().mockResolvedValue({ stage: 'pin' })
    const setPin = vi.fn<AuthApi['setPin']>()
    const resetSendOtp = vi.fn().mockResolvedValue({
      stage: 'reset-otp',
      otpId: 'test-reset-otp-a',
      expiresInSeconds: 60,
    })
    const resetResendOtp = vi.fn().mockResolvedValue({
      stage: 'reset-otp',
      otpId: 'test-reset-otp-b',
      expiresInSeconds: 60,
    })
    const resetVerifyOtp = vi.fn().mockResolvedValue({ stage: 'set-pin' })
    const resetSetPin = vi.fn().mockResolvedValue({ stage: 'pin' })
    const { api, controller, session, setNow } = setup({
      sendOtp,
      setPin,
      resetSendOtp,
      resetResendOtp,
      resetVerifyOtp,
      resetSetPin,
    })

    await controller.startLogin('998901234567')
    await controller.startReset()
    expect(resetSendOtp).toHaveBeenCalledTimes(1)
    expect(controller.getSnapshot().phase).toBe('reset-otp')

    setNow(61_001)
    await controller.resendOtp()
    expect(resetResendOtp).toHaveBeenCalledTimes(1)
    await controller.submitOtp('001234')
    expect(resetVerifyOtp).toHaveBeenCalledTimes(1)
    await controller.submitNewPin('0012', '0012')

    expect(resetSetPin).toHaveBeenCalledTimes(1)
    expect(setPin).not.toHaveBeenCalled()
    expect(session.establishSession).not.toHaveBeenCalled()
    await controller.submitPin('0012')
    expect(api.checkPin).toHaveBeenCalledTimes(1)
    expect(session.establishSession).toHaveBeenCalledTimes(1)
  })

  it('collapses double submit into one create-session call', async () => {
    const created = deferred<{
      readonly sessionKey: string
      readonly reply: StageReply
    }>()
    const createSessionStarted = deferred<void>()
    const createSession = vi.fn(() => {
      createSessionStarted.resolve(undefined)
      return created.promise
    })
    const { api, controller, lease } = setup({ createSession })

    const first = controller.startLogin('998901234567')
    const second = controller.startLogin('998901234567')
    await createSessionStarted.promise

    expect(lease.acquire).toHaveBeenCalledTimes(1)
    expect(createSession).toHaveBeenCalledTimes(1)
    created.resolve({ sessionKey: 'test-session', reply: { stage: 'otp' } })
    await Promise.all([first, second])

    expect(api.sendOtp).toHaveBeenCalledTimes(1)
    expect(controller.getSnapshot().phase).toBe('otp')
  })

  it('blocks verify and resend until the OTP deadline, then uses the new generation', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ stage: 'pin' })
    const resendOtp = vi.fn().mockResolvedValue({
      stage: 'otp',
      otpId: 'test-otp-b',
      expiresInSeconds: 60,
    })
    const { controller, setNow } = setup({ verifyOtp, resendOtp })
    await controller.startLogin('998901234567')

    await controller.resendOtp()
    expect(resendOtp).not.toHaveBeenCalled()
    setNow(61_001)
    await controller.submitOtp('001234')
    expect(verifyOtp).not.toHaveBeenCalled()

    await controller.resendOtp()
    expect(resendOtp).toHaveBeenCalledTimes(1)
    expect(controller.getOtpRemainingMs()).toBe(60_000)
    await controller.submitOtp('001234')
    expect(verifyOtp).toHaveBeenCalledWith(
      'test-session',
      { otpId: 'test-otp-b', otpCode: '001234' },
      expect.any(Object),
    )
  })

  it('ends the current login attempt when OTP verification reports expiry', async () => {
    const verifyOtp = vi.fn().mockRejectedValue(safeBusinessError({ tag: 'OTP_EXPIRED' }))
    const resendOtp = vi.fn<AuthApi['resendOtp']>()
    const { controller } = setup({ verifyOtp, resendOtp })
    await controller.startLogin('998901234567')

    await controller.submitOtp('001234')

    expect(verifyOtp).toHaveBeenCalledWith(
      'test-session',
      { otpId: 'test-otp-a', otpCode: '001234' },
      expect.any(Object),
    )
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'expired',
      pending: false,
      message: 'sessionExpired',
    })
    expect(controller.getSnapshot().otpDeadlineMs).toBeUndefined()
    expect(controller.getOtpRemainingMs()).toBe(0)

    await controller.resendOtp()
    await controller.submitOtp('001234')
    expect(resendOtp).not.toHaveBeenCalled()
    expect(verifyOtp).toHaveBeenCalledTimes(1)
  })

  it('ends the current reset attempt when reset OTP verification reports expiry', async () => {
    const sendOtp = vi.fn().mockResolvedValue({ stage: 'pin' })
    const resetVerifyOtp = vi.fn().mockRejectedValue(safeBusinessError({ tag: 'OTP_EXPIRED' }))
    const resetResendOtp = vi.fn<AuthApi['resetResendOtp']>()
    const { controller } = setup({ sendOtp, resetVerifyOtp, resetResendOtp })
    await controller.startLogin('998901234567')
    await controller.startReset()
    expect(controller.getSnapshot().phase).toBe('reset-otp')

    await controller.submitOtp('001234')

    expect(resetVerifyOtp).toHaveBeenCalledWith(
      'test-session',
      { otpId: 'test-reset-otp-a', otpCode: '001234' },
      expect.any(Object),
    )
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'expired',
      pending: false,
      message: 'sessionExpired',
    })
    expect(controller.getSnapshot().otpDeadlineMs).toBeUndefined()
    expect(controller.getOtpRemainingMs()).toBe(0)

    await controller.resendOtp()
    await controller.submitOtp('001234')
    expect(resetResendOtp).not.toHaveBeenCalled()
    expect(resetVerifyOtp).toHaveBeenCalledTimes(1)
  })

  it('creates a fresh session and OTP after restarting an expired login attempt', async () => {
    const createSession = vi.fn()
      .mockResolvedValueOnce({ sessionKey: 'expired-session', reply: { stage: 'otp' } })
      .mockResolvedValueOnce({ sessionKey: 'fresh-session', reply: { stage: 'otp' } })
    const sendOtp = vi.fn()
      .mockResolvedValueOnce({ stage: 'otp', otpId: 'expired-otp', expiresInSeconds: 60 })
      .mockResolvedValueOnce({ stage: 'otp', otpId: 'fresh-otp', expiresInSeconds: 60 })
    const verifyOtp = vi.fn()
      .mockRejectedValueOnce(safeBusinessError({ tag: 'OTP_EXPIRED' }))
      .mockResolvedValueOnce({ stage: 'pin' })
    const { controller } = setup({ createSession, sendOtp, verifyOtp })
    await controller.startLogin('998901234567')
    await controller.submitOtp('001234')
    expect(controller.getSnapshot().phase).toBe('expired')

    controller.restart()
    expect(controller.getSnapshot().phase).toBe('phone')
    await controller.startLogin('998901234567')
    expect(createSession).toHaveBeenCalledTimes(2)
    expect(sendOtp).toHaveBeenLastCalledWith(
      'fresh-session', '998901234567', expect.any(Object),
    )
    expect(controller.getSnapshot().phase).toBe('otp')

    await controller.submitOtp('001234')
    expect(verifyOtp).toHaveBeenLastCalledWith(
      'fresh-session',
      { otpId: 'fresh-otp', otpCode: '001234' },
      expect.any(Object),
    )
    expect(controller.getSnapshot().phase).toBe('pin')
  })

  it('fails closed on an unexpected normalized stage', async () => {
    const { controller, session, lease } = setup({
      sendOtp: vi.fn().mockResolvedValue({ stage: 'done' }),
    })

    await controller.startLogin('998901234567')

    expect(controller.getSnapshot().phase).toBe('error')
    expect(session.establishSession).not.toHaveBeenCalled()
    expect(lease.release).toHaveBeenCalledTimes(1)
  })

  it('ignores a late reply after restart', async () => {
    const sent = deferred<StageReply>()
    const { controller, session } = setup({ sendOtp: () => sent.promise })
    const start = controller.startLogin('998901234567')
    await Promise.resolve()
    await Promise.resolve()

    controller.restart()
    sent.resolve({ stage: 'pin' })
    await start

    expect(controller.getSnapshot().phase).toBe('phone')
    expect(session.establishSession).not.toHaveBeenCalled()
  })

  it('ignores a late reply after disposal', async () => {
    const sent = deferred<StageReply>()
    const { controller, session, lease } = setup({ sendOtp: () => sent.promise })
    const start = controller.startLogin('998901234567')
    await Promise.resolve()
    await Promise.resolve()

    controller.dispose()
    sent.resolve({ stage: 'pin' })
    await start

    expect(session.establishSession).not.toHaveBeenCalled()
    expect(lease.release).toHaveBeenCalledTimes(1)
  })
})
