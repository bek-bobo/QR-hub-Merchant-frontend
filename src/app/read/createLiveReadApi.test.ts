import { describe, expect, it, vi } from 'vitest'
import type { ProtectedReadBridge } from '@/shared/api/protected-read'
import { createLiveReadApi, ReadConfigurationError } from './createLiveReadApi'

describe('live read API registration', () => {
  it('throws locally without a request when the web base is unavailable', async () => {
    const bridge: ProtectedReadBridge = { get: vi.fn() }
    const runtime = createLiveReadApi({
      webBaseUrl: undefined,
      environment: 'production',
      bridge,
    })

    expect(runtime.registrations.dashboard.kind).toBe('unavailable')
    await expect(
      runtime.dashboard(
        { fromDate: '2026-09-01', toDate: '2026-09-15' },
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(ReadConfigurationError)
    expect(bridge.get).not.toHaveBeenCalled()
  })

  it('builds exact endpoint queries without forbidden parameters', async () => {
    const get = vi.fn().mockResolvedValue({ content: [] })
    const bridge: ProtectedReadBridge = { get }
    const runtime = createLiveReadApi({
      webBaseUrl: 'https://merchant.example/qh-merchant-web-api',
      environment: 'production',
      bridge,
    })

    await runtime.dynamicQrs(
      {
        fromDate: '2026-09-01',
        toDate: '2026-09-15',
        search: '  terminal  ',
        status: 0,
        page: 0,
        size: 10,
      },
      new AbortController().signal,
    )

    const request = get.mock.calls[0]?.[0]
    expect(request.endpoint.path).toBe('/dynamic-qrs/get-all')
    expect(request.query).toEqual({
      fromDate: '2026-09-01',
      toDate: '2026-09-15',
      search: 'terminal',
      status: '0',
      page: '0',
      size: '10',
    })
    expect(request.query).not.toHaveProperty('sort')
    expect(request.query).not.toHaveProperty('statusCode')
    expect(request.query).not.toHaveProperty('merchantId')
  })
  it('keeps management list and parent lookup requests independent', async () => {
    const get = vi.fn().mockResolvedValue({ content: [] })
    const runtime = createLiveReadApi({ webBaseUrl: 'https://merchant.example/qh-merchant-web-api', environment: 'production', bridge: { get } })
    const signal = new AbortController().signal
    await runtime.terminalList({ merchantId: '2', bankAccountId: '3', search: ' A ', page: 0, size: 10 }, signal)
    await runtime.bankAccountLookup('2', signal)
    await runtime.terminalsForMerchant('2', signal)
    expect(get.mock.calls[0]?.[0]).toMatchObject({ endpoint: { path: '/terminals/get-all' }, query: { merchantId: '2', bankAccountId: '3', search: 'A', page: '0', size: '10' } })
    expect(get.mock.calls[1]?.[0]).toMatchObject({ endpoint: { path: '/dropdown/bank-accounts' }, query: { merchantId: '2' } })
    expect(get.mock.calls[2]?.[0]).toMatchObject({ endpoint: { path: '/dropdown/terminals' }, query: { merchantId: '2' } })
  })
  it('builds the exact P5 list request without reset wiring', async () => {
    const get = vi.fn().mockResolvedValue({ content: [] })
    const runtime = createLiveReadApi({ webBaseUrl: 'https://merchant.example/qh-merchant-web-api', environment: 'production', bridge: { get } })
    await runtime.p5List({ merchantId: '2', terminalId: 'terminal-a', status: 0, search: ' Device ', page: 1, size: 25 }, new AbortController().signal)
    expect(get.mock.calls[0]?.[0]).toMatchObject({
      endpoint: { method: 'GET', path: '/p5/get-all' },
      query: { merchantId: '2', terminalId: 'terminal-a', status: '0', search: 'Device', page: '1', size: '25' },
    })
    expect(runtime).not.toHaveProperty('p5ResetPin')
  })
})
