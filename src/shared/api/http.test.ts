import { describe, expect, it, vi } from 'vitest'
import { createLiveAuthApi } from './auth-api'
import {
  createHttpTransport,
  validateAuthBaseUrl,
  type TransportRequest,
} from './http'
import { productionAuthContractRegistration } from '@/shared/contracts/auth.contract'
import { endpoints } from '@/shared/contracts/endpoints'

function validBase(value: string) {
  const result = validateAuthBaseUrl(value, 'production')
  if (result.kind !== 'valid') {
    throw result.error
  }
  return result.value
}

function emptyResponse(): Response {
  return new Response(null, { status: 204 })
}

describe('HTTP policy', () => {
  it('sends no JSON body or content type for bodyless endpoints', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => emptyResponse())
    const transport = createHttpTransport({
      service: 'auth',
      baseUrl: validBase('https://api.example.test/qh-merchant-auth-api'),
      fetchImpl,
    })

    const requests: readonly TransportRequest[] = [
      {
        endpoint: endpoints.createSession,
        credential: {
          kind: 'device-key',
          deviceKey: '00000000-0000-4000-8000-000000000001',
        },
      },
      {
        endpoint: endpoints.resendOtp,
        credential: { kind: 'session-key', sessionKey: 'test-session' },
      },
      {
        endpoint: endpoints.resetResendOtp,
        credential: { kind: 'session-key', sessionKey: 'test-session' },
      },
      {
        endpoint: endpoints.me,
        credential: { kind: 'bearer', accessToken: 'test-access' },
      },
      {
        endpoint: endpoints.logout,
        credential: { kind: 'bearer', accessToken: 'test-access' },
      },
    ]

    for (const request of requests) {
      await transport.request(request)
    }

    expect(fetchImpl).toHaveBeenCalledTimes(requests.length)
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init?.body).toBeUndefined()
      expect(new Headers(init?.headers).has('content-type')).toBe(false)
    }
  })

  it('preserves configured gateway and service context prefixes', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(emptyResponse())
    const transport = createHttpTransport({
      service: 'auth',
      baseUrl: validBase(
        'https://api.example.test/api/qh-merchant-auth-api/',
      ),
      fetchImpl,
    })

    await transport.request({
      endpoint: endpoints.me,
      credential: { kind: 'bearer', accessToken: 'test-access' },
    })

    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
      'https://api.example.test/api/qh-merchant-auth-api/user/get-me',
    )
  })

  it('attaches Authorization only to a descriptor-controlled bearer request', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(emptyResponse())
    const transport = createHttpTransport({
      service: 'auth',
      baseUrl: validBase('https://api.example.test/qh-merchant-auth-api'),
      fetchImpl,
    })

    await transport.request({
      endpoint: endpoints.me,
      credential: { kind: 'bearer', accessToken: 'test-access' },
    })
    const bearerHeaders = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers)
    expect(bearerHeaders.get('authorization')).toBe('Bearer test-access')

    await expect(
      transport.request({
        endpoint: endpoints.createSession,
        credential: { kind: 'bearer', accessToken: 'test-access' },
      }),
    ).rejects.toMatchObject({ kind: 'configuration' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('preserves a 403 status even when its deployment-specific body is not JSON', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('Forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      }),
    )
    const transport = createHttpTransport({
      service: 'auth',
      baseUrl: validBase('https://api.example.test/qh-merchant-auth-api'),
      fetchImpl,
    })

    await expect(
      transport.request({
        endpoint: endpoints.me,
        credential: { kind: 'bearer', accessToken: 'test-access' },
      }),
    ).resolves.toMatchObject({ ok: false, status: 403, body: 'Forbidden' })
  })

  it('keeps all 13 auth endpoint descriptors distinct', () => {
    const authEndpoints = Object.values(endpoints).filter(
      (endpoint) => endpoint.service === 'auth',
    )
    expect(authEndpoints).toHaveLength(13)
    expect(new Set(authEndpoints.map((endpoint) => endpoint.path)).size).toBe(13)
  })

  it('creates the statically configured live factory without issuing a request', () => {
    const fetchImpl = vi.fn<typeof fetch>()

    const result = createLiveAuthApi({
      authBaseUrl: 'https://api.example.test/qh-merchant-auth-api',
      environment: 'production',
      contract: productionAuthContractRegistration,
      fetchImpl,
    })

    expect(result.kind).toBe('ready')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
