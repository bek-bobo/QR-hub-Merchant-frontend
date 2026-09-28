import { describe, expect, it, vi } from 'vitest'
import { safeContractError } from '@/shared/api/errors'
import { endpoints } from '@/shared/contracts/endpoints'
import type { ProtectedOperation } from '@/shared/auth/session-controller'
import {
  createProtectedReadBridge,
  type ProtectedReadSession,
} from './protected-read'
import type { HttpTransport } from './http'

describe('protected read bridge', () => {
  it('never returns a late binary body after the caller scope aborts', async () => {
    let release!: (blob: Blob) => void
    const body = new Promise<Blob>((resolve) => { release = resolve })
    const caller = new AbortController()
    const session: ProtectedReadSession = {
      async protectedRead<T>(operation: ProtectedOperation<T>) {
        try {
          return { status: 'success', data: await operation({ accessToken: 'private-token', signal: new AbortController().signal }) }
        } catch { return { status: 'failed' } }
      },
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const baseUrl = 'https://example.test/qh-merchant-web-api' as Parameters<NonNullable<ReturnType<typeof createProtectedReadBridge>['getXlsx']>>[0]['baseUrl']
    try {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        blob: () => body,
      } as Response)
      const flight = createProtectedReadBridge(session).getXlsx!({ baseUrl, endpoint: endpoints.exportDynamicQrs, query: {} }, caller.signal)
      await Promise.resolve()
      caller.abort()
      expect((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.signal?.aborted).toBe(true)
      release(new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1])]))
      await expect(flight).rejects.toThrow()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally { fetchMock.mockRestore() }
  })
  it('maps binary 403 to access denial without starting another protected read', async () => {
    let calls = 0
    const session: ProtectedReadSession = {
      async protectedRead<T>(_operation: ProtectedOperation<T>) { calls++; return { status: 'access-denied' as const } },
    }
    const baseUrl = 'https://example.test/qh-merchant-web-api' as Parameters<NonNullable<ReturnType<typeof createProtectedReadBridge>['getXlsx']>>[0]['baseUrl']
    await expect(createProtectedReadBridge(session).getXlsx!({
      baseUrl, endpoint: endpoints.exportDynamicQrs, query: {},
    })).rejects.toMatchObject({ kind: 'http', status: 403 })
    expect(calls).toBe(1)
  })
  it('accepts XLSX bytes and rejects a 200 JSON response before download', async () => {
    const session: ProtectedReadSession = {
      async protectedRead<T>(operation: ProtectedOperation<T>) {
        try {
          return { status: 'success', data: await operation({ accessToken: 'private-token', signal: new AbortController().signal }) }
        } catch { return { status: 'failed' } }
      },
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const baseUrl = 'https://example.test/qh-merchant-web-api' as Parameters<NonNullable<ReturnType<typeof createProtectedReadBridge>['getXlsx']>>[0]['baseUrl']
    try {
      fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1]), {
        headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      }))
      const bridge = createProtectedReadBridge(session)
      await expect(bridge.getXlsx!({ baseUrl, endpoint: endpoints.exportDynamicQrs, query: { status: '0' } }))
        .resolves.toMatchObject({ blob: expect.any(Blob), filename: 'dynamic-qrs.xlsx' })
      expect(fetchMock.mock.calls[0]?.[0].toString()).toContain('status=0')
      fetchMock.mockResolvedValueOnce(new Response('{"success":false}', { headers: { 'content-type': 'application/json' } }))
      await expect(bridge.getXlsx!({ baseUrl, endpoint: endpoints.exportDynamicQrs, query: {} })).rejects.toThrow()
    } finally { fetchMock.mockRestore() }
  })
  it('delegates once to SessionController and passes cancellation to transport', async () => {
    const sessionAbort = new AbortController()
    const callerAbort = new AbortController()
    let protectedReadCalls = 0
    const session: ProtectedReadSession = {
      async protectedRead<T>(operation: ProtectedOperation<T>) {
        protectedReadCalls += 1
        return {
          status: 'success',
          data: await operation({
            accessToken: 'private-token',
            signal: sessionAbort.signal,
          }),
        }
      },
    }
    const request = vi.fn(async (input) => {
      callerAbort.abort()
      expect(input.signal?.aborted).toBe(true)
      return {
        ok: true,
        status: 200,
        headers: { contentType: 'application/json', requestId: null },
        body: { success: true, data: 7 },
      }
    })
    const transport: HttpTransport = { request }
    const bridge = createProtectedReadBridge(session)

    await expect(
      bridge.get(
        {
          transport,
          endpoint: endpoints.dashboard,
          decode: (payload) => (payload as { data: number }).data,
        },
        callerAbort.signal,
      ),
    ).resolves.toBe(7)

    expect(protectedReadCalls).toBe(1)
  })

  it('rethrows the explicit operation error returned as a failed read', async () => {
    const contractError = safeContractError()
    const session: ProtectedReadSession = {
      async protectedRead(operation) {
        try {
          await operation({
            accessToken: 'private-token',
            signal: new AbortController().signal,
          })
        } catch {
          return { status: 'failed' }
        }
        return { status: 'failed' }
      },
    }
    const transport: HttpTransport = {
      request: vi.fn().mockRejectedValue(contractError),
    }

    await expect(
      createProtectedReadBridge(session).get({
        transport,
        endpoint: endpoints.dashboard,
        decode: () => undefined,
      }),
    ).rejects.toBe(contractError)
  })
})
