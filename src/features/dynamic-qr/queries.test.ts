import { describe, expect, it, vi } from 'vitest'
import type { ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { createDynamicQrQueryOptions } from './queries'

const filters: DynamicQrFilters = {
  fromDate: '2026-09-09',
  toDate: '2026-09-15',
  status: 0,
  search: '',
  page: 0,
  size: 10,
}

describe('dynamic QR query composition', () => {
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
