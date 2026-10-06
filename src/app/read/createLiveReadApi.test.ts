import { describe, expect, it, vi } from 'vitest'
import type { ProtectedReadBridge } from '@/shared/api/protected-read'
import { createLiveReadApi, ReadConfigurationError } from './createLiveReadApi'

describe('live read API registration', () => {
  it('uses confirmed geography DropdownDTO decoders, bearer endpoints and a required region query', async () => {
    const get = vi.fn().mockResolvedValue([])
    const api = createLiveReadApi({ webBaseUrl: 'https://merchant.example/qh-merchant-web-api', environment: 'production', bridge: { get } })
    const signal = new AbortController().signal
    await api.regionLookup(signal)
    await api.districtLookup(' 7 ', signal)
    const regionRequest = get.mock.calls[0]![0]
    const districtRequest = get.mock.calls[1]![0]
    expect(regionRequest.endpoint).toEqual({ service: 'web', method: 'GET', path: '/dropdown/regions', auth: 'bearer', body: 'none' })
    expect(regionRequest.query).toBeUndefined()
    expect(districtRequest.endpoint).toEqual({ service: 'web', method: 'GET', path: '/dropdown/districts', auth: 'bearer', body: 'none' })
    expect(districtRequest.query).toEqual({ regionId: '7' })
    expect(get.mock.calls[1]![1]).toBe(signal)
    for (const request of [regionRequest, districtRequest]) {
      expect(request.decode({ success: true, data: [{ id: '007', name: 'Uzbek name' }] })).toEqual([{ id: '007', name: 'Uzbek name' }])
      expect(request.decode({ success: true, data: [] })).toEqual([])
      expect(() => request.decode({ success: false, data: [] })).toThrow()
      expect(() => request.decode({ success: true, data: [{ regionId: 7, nameUz: 'Wrong shape' }] })).toThrow()
      expect(() => request.decode({ success: true, data: [{ id: 7, name: 'Numeric instead of String' }] })).toThrow()
    }
    for (const id of ['', ' ', 'x', '9007199254740992']) expect(() => api.districtLookup(id, signal)).toThrow()
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('adds geography to the existing Terminal list port with only supported wire fields', async () => {
    const get = vi.fn().mockResolvedValue({ content: [] })
    const api = createLiveReadApi({ webBaseUrl: 'https://merchant.example/qh-merchant-web-api', environment: 'production', bridge: { get } })
    await api.terminalList({ merchantId: '1', bankAccountId: '2', regionId: ' 3 ', districtId: ' 4 ', search: ' Terminal ', page: 2, size: 20 }, new AbortController().signal)
    expect(get.mock.calls[0]![0].endpoint.path).toBe('/terminals/get-all')
    expect(get.mock.calls[0]![0].query).toEqual({ merchantId: '1', bankAccountId: '2', regionId: '3', districtId: '4', search: 'Terminal', page: '2', size: '20' })
  })

  it('rejects unavailable geography locally without entering the bridge', async () => {
    const get = vi.fn()
    const api = createLiveReadApi({ webBaseUrl: undefined, environment: 'production', bridge: { get } })
    await expect(api.regionLookup(new AbortController().signal)).rejects.toBeInstanceOf(ReadConfigurationError)
    await expect(api.districtLookup('7', new AbortController().signal)).rejects.toBeInstanceOf(ReadConfigurationError)
    expect(get).not.toHaveBeenCalled()
  })
  it('forwards all applied Dynamic QR structured filters through the existing list port', async () => {
    const get = vi.fn().mockResolvedValue({ content: [] })
    const runtime = createLiveReadApi({ webBaseUrl: 'https://merchant.example/qh-merchant-web-api',
      environment: 'production', bridge: { get } })
    await runtime.dynamicQrs({ fromDate: '2026-09-01', toDate: '2026-09-15', merchantId: ' 1 ',
      bankAccountId: ' 2 ', terminalId: 'terminal-a', status: 25, distributionStatus: 20,
      search: ' Name ', page: 0, size: 20 }, new AbortController().signal)
    expect(get.mock.calls[0]?.[0]).toMatchObject({ endpoint: { path: '/dynamic-qrs/get-all' },
      query: { fromDate: '2026-09-01', toDate: '2026-09-15', merchantId: '1', bankAccountId: '2',
        terminalId: 'terminal-a', status: '25', distributionStatus: '20', search: 'Name', page: '0', size: '20' } })
  })
  it('routes stats through the protected bridge with only date and terminal parameters', async () => {
    const get = vi.fn().mockResolvedValue({})
    const runtime = createLiveReadApi({ webBaseUrl: 'https://merchant.example/qh-merchant-web-api', environment: 'production', bridge: { get } })
    const signal = new AbortController().signal
    const filters = { fromDate: '2026-09-01', toDate: '2026-09-15', terminalId: ' T-01 ',
      merchantId: '1', bankAccountId: '2', distributionStatus: 20, status: 25, search: 'abc', page: 2, size: 25 }
    await runtime.dynamicQrStats(filters, signal)
    const [request, passedSignal] = get.mock.calls[0]!
    expect(request.endpoint).toEqual({ service: 'web', method: 'GET', path: '/dynamic-qrs/stats', auth: 'bearer', body: 'none' })
    expect(request.query).toEqual({ fromDate: filters.fromDate, toDate: filters.toDate, terminalId: 'T-01' })
    expect(passedSignal).toBe(signal)
    await runtime.dynamicQrStats({ fromDate: filters.fromDate, toDate: filters.toDate }, signal)
    expect(get.mock.calls[1]![0].query).toEqual({ fromDate: filters.fromDate, toDate: filters.toDate })
  })

  it('rejects unavailable stats locally', async () => {
    const get = vi.fn()
    const runtime = createLiveReadApi({ webBaseUrl: undefined, environment: 'production', bridge: { get } })
    await expect(runtime.dynamicQrStats({ fromDate: '2026-09-01', toDate: '2026-09-15' }, new AbortController().signal)).rejects.toBeInstanceOf(ReadConfigurationError)
    expect(get).not.toHaveBeenCalled()
  })
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

describe('Dashboard analytics request serialization', () => {
  it.each(['AUTO', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'] as const)('serializes %s with exact dates, trimmed terminal and no caller identity', async (granularity) => {
    const get = vi.fn().mockResolvedValue({})
    const api = createLiveReadApi({ webBaseUrl: 'https://merchant.example/qh-merchant-web-api', environment: 'production', bridge: { get } })
    const signal = new AbortController().signal
    const filters = { fromDate: '2026-09-01', toDate: '2026-09-30', terminalId: ' T1 ', granularity, userId: 'forbidden', merchantId: 'forbidden' }
    await api.dashboard(filters, signal)
    const [request, passedSignal] = get.mock.calls[0]!
    expect(request.endpoint.path).toBe('/dashboard/transactions')
    expect(request.query).toEqual({ fromDate: filters.fromDate, toDate: filters.toDate, terminalId: 'T1', granularity })
    expect(passedSignal).toBe(signal)
    await api.dashboard({ fromDate: filters.fromDate, toDate: filters.toDate }, signal)
    expect(get.mock.calls[1]![0].query).toEqual({ fromDate: filters.fromDate, toDate: filters.toDate, granularity: 'AUTO' })
  })
})
