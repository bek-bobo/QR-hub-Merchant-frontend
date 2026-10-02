import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { safeHttpError } from '@/shared/api/errors'
import type { ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { createDynamicQrQueryOptions, createDynamicQrStatsQueryOptions } from './queries'

const filters: DynamicQrFilters = {
  fromDate: '2026-09-09',
  toDate: '2026-09-15',
  status: 0,
  search: '',
  page: 0,
  size: 20,
}

const statsEnabledConfig = { dynamicQrStatsEnabled: true }

describe('dynamic QR query composition', () => {
  it('projects only applied date and terminal filters for stats and preserves policy', () => {
    const dynamicQrStatsOptions = vi.fn(() => ({ enabled: true, retry: false, staleTime: 30_000 }))
    const queries = { dynamicQrStatsOptions } as unknown as ReadRuntimeContextValue['queries']
    const options = createDynamicQrStatsQueryOptions(queries, { ...filters, merchantId: '1', bankAccountId: '2',
      distributionStatus: 20, status: 25, terminalId: 'terminal-a', search: 'abc', page: 2 }, 'valid', statsEnabledConfig)
    expect(dynamicQrStatsOptions).toHaveBeenCalledWith({ fromDate: filters.fromDate, toDate: filters.toDate, terminalId: 'terminal-a' })
    expect(options).toMatchObject({ enabled: true, retry: false, staleTime: 30_000 })
  })

  it.each(['checking', 'invalid'] as const)('disables stats for %s terminal state', (state) => {
    const queries = { dynamicQrStatsOptions: () => ({ enabled: true }) } as unknown as ReadRuntimeContextValue['queries']
    expect(createDynamicQrStatsQueryOptions(queries, filters, state, statsEnabledConfig).enabled).toBe(false)
  })

  it.each([
    { fromDate: '2026-09-16', toDate: '2026-09-15' },
    { fromDate: '2026-02-30', toDate: '2026-09-15' },
  ])('disables stats for invalid dates: %s', (range) => {
    const queries = { dynamicQrStatsOptions: () => ({ enabled: true }) } as unknown as ReadRuntimeContextValue['queries']
    expect(createDynamicQrStatsQueryOptions(queries, { ...filters, ...range }, 'valid', statsEnabledConfig).enabled).toBe(false)
  })

  it('preserves a disabled stats capability', () => {
    const queries = { dynamicQrStatsOptions: () => ({ enabled: false }) } as unknown as ReadRuntimeContextValue['queries']
    expect(createDynamicQrStatsQueryOptions(queries, filters, 'valid', statsEnabledConfig).enabled).toBe(false)
  })

  it('does not call the stats API when disabled while the list runs normally', async () => {
    const statsApi = vi.fn(async () => ({ totalAmount: null, totalServiceFeeAmount: null }))
    const listApi = vi.fn(async () => ({ content: [], page: 0, size: 20, totalPages: 0, totalElements: 0 }))
    const queries = {
      dynamicQrStatsOptions: () => ({ queryKey: ['stats-disabled'], queryFn: statsApi, enabled: true, retry: false }),
      dynamicQrOptions: () => ({ queryKey: ['list-enabled'], queryFn: listApi, enabled: true, retry: false }),
    } as unknown as ReadRuntimeContextValue['queries']
    const client = new QueryClient()
    const stats = new QueryObserver(client, createDynamicQrStatsQueryOptions(queries, filters, 'valid', { dynamicQrStatsEnabled: false }))
    const list = new QueryObserver(client, createDynamicQrQueryOptions(queries, filters, 'valid'))
    const unsubscribeStats = stats.subscribe(() => {})
    const unsubscribeList = list.subscribe(() => {})
    try {
      await vi.waitFor(() => expect(list.getCurrentResult().isSuccess).toBe(true))
      expect(stats.getCurrentResult().fetchStatus).toBe('idle')
      expect(statsApi).not.toHaveBeenCalled()
      expect(listApi).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribeStats()
      unsubscribeList()
      client.clear()
    }
  })

  it('runs the stats API after explicit opt-in with valid prerequisites', async () => {
    const statsApi = vi.fn(async () => ({ totalAmount: null, totalServiceFeeAmount: null }))
    const queries = {
      dynamicQrStatsOptions: () => ({ queryKey: ['stats-enabled'], queryFn: statsApi, enabled: true, retry: false }),
    } as unknown as ReadRuntimeContextValue['queries']
    const client = new QueryClient()
    const observer = new QueryObserver(client, createDynamicQrStatsQueryOptions(queries, filters, 'valid', statsEnabledConfig))
    const unsubscribe = observer.subscribe(() => {})
    try {
      await vi.waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true))
      expect(statsApi).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribe()
      client.clear()
    }
  })

  it('preserves protected 401 failures when stats are enabled', async () => {
    const unauthorized = safeHttpError(401)
    const queries = {
      dynamicQrStatsOptions: () => ({ enabled: true, queryFn: vi.fn().mockRejectedValue(unauthorized) }),
    } as unknown as ReadRuntimeContextValue['queries']
    const options = createDynamicQrStatsQueryOptions(queries, filters, 'valid', statsEnabledConfig)
    expect(options.enabled).toBe(true)
    await expect(options.queryFn({ signal: new AbortController().signal })).rejects.toBe(unauthorized)
  })
  it('keeps status zero and existing runtime policy', () => {
    const dynamicQrOptions = vi.fn(() => ({
      queryKey: ['live', 'scope', 1, 'dynamic-qrs', 0],
      queryFn: vi.fn(),
      enabled: true,
      retry: false as const,
      staleTime: 30_000 as const,
      refetchOnWindowFocus: false as const,
      refetchOnReconnect: false as const,
    }))
    const queries = {
      dynamicQrOptions,
    } as unknown as ReadRuntimeContextValue['queries']

    const options = createDynamicQrQueryOptions(queries, filters, 'valid')

    expect(dynamicQrOptions).toHaveBeenCalledWith(filters)
    expect(options.enabled).toBe(true)
    expect(options).toMatchObject({ retry: false, staleTime: 30_000 })
  })

  it('disables execution when an applied terminal can no longer be confirmed', () => {
    const queries = {
      dynamicQrOptions: vi.fn(() => ({
        queryKey: ['live', 'scope', 1, 'dynamic-qrs'],
        queryFn: vi.fn(),
        enabled: true,
        retry: false,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      })),
    } as unknown as ReadRuntimeContextValue['queries']

    expect(createDynamicQrQueryOptions(queries, filters, 'invalid').enabled)
      .toBe(false)
  })
})
