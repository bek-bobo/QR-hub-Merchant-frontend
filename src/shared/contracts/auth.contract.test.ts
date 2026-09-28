import { describe, expect, it } from 'vitest'
import { productionAuthContractRegistration } from './auth.contract'

function wire() {
  if (productionAuthContractRegistration.kind !== 'verified') {
    throw new Error('Production auth contract is not registered.')
  }

  return productionAuthContractRegistration.wire
}

describe('production auth wire contract', () => {
  it('normalizes an HTTP 200 business failure without using localized text', () => {
    const error = wire().classifyError({
      ok: true,
      status: 200,
      body: {
        success: false,
        error: {
          code: 40018,
          tag: 'REFRESH_TOKEN_ALREADY_USED',
          text: 'localized and non-authoritative',
        },
        data: null,
      },
    })

    expect(error).toMatchObject({
      kind: 'business',
      code: 40018,
      tag: 'REFRESH_TOKEN_ALREADY_USED',
    })
    expect(error?.message).not.toContain('localized')
  })

  it('classifies raw 401 and 403 responses by status before body shape', () => {
    expect(
      wire().classifyError({
        ok: false,
        status: 401,
        body: { error: 'UNAUTHORIZED', message: 'ignored', path: '/user/get-me' },
      }),
    ).toMatchObject({ kind: 'http', status: 401 })

    expect(
      wire().classifyError({
        ok: false,
        status: 403,
        body: '<unknown deployment-specific body>',
      }),
    ).toMatchObject({ kind: 'http', status: 403 })
  })

  it('accepts nullable OTP metadata only as absent normalized metadata', () => {
    expect(
      wire().decodeStageReply({
        success: true,
        data: {
          otpId: null,
          expiresInSeconds: null,
          stage: 'CHECK_PASSWORD',
        },
      }),
    ).toEqual({ stage: 'pin' })
  })

  it('fails closed for an unknown stage and a malformed DONE token pair', () => {
    expect(() =>
      wire().decodeStageReply({
        success: true,
        data: { stage: 'FUTURE_STAGE' },
      }),
    ).toThrow()

    expect(() =>
      wire().decodeStageReply({
        success: true,
        data: {
          stage: 'DONE',
          token: {
            accessToken: 'access',
            refreshToken: '',
            accessTokenTtlMinutes: 10,
            refreshTokenTtlDays: 15,
          },
        },
      }),
    ).toThrow()
  })

  it('ignores non-core device metadata but requires exact permission strings', () => {
    expect(
      wire().decodeProfile({
        success: true,
        data: {
          userId: 42,
          phone: '998901234567',
          fullname: null,
          deviceType: 'UNUSED_BY_FRONTEND_AUTHORIZATION',
          roles: ['MERCHANT'],
          permissions: ['GET_ME'],
        },
      }),
    ).toEqual({
      userId: '42',
      phone: '998901234567',
      fullname: null,
      roles: ['MERCHANT'],
      permissions: ['GET_ME'],
    })
  })
})
