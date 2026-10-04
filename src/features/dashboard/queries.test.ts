import { describe, expect, it, vi } from 'vitest'
import type { ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import type { DashboardFilters } from '@/shared/contracts/merchant-read'
import { readKeys } from '@/shared/api/read-keys'
import { toDateTerminalQuery } from '@/shared/filters/date-range'
import {
  createDashboardQueryOptions,
  deriveRecentQrFilters,
} from './queries'

describe('dashboard query composition', () => {
  it('keeps request parameters and cache identity independent of returned granularity', () => {
    const filters = { fromDate: '2026-10-01', toDate: '2026-10-07', terminalId: 'terminal-a' }
    expect(toDateTerminalQuery(filters)).toEqual(filters)
    expect(readKeys.dashboard({ source: 'live', sessionScopeId: 'session', accessRevision: 1 }, filters))
      .toEqual(['live', 'session', 1, 'dashboard', '2026-10-01', '2026-10-07', 'terminal-a'])
    expect(toDateTerminalQuery(filters)).not.toHaveProperty('groupBy')
  })

  it('disables an invalid applied range before query execution', () => {
    const dashboardOptions = vi.fn((filters: DashboardFilters) => ({
      queryKey: ['live', 'scope', 1, 'dashboard', filters.fromDate],
      queryFn: vi.fn(),
      enabled: true,
      retry: false as const,
      staleTime: 30_000 as const,
      refetchOnWindowFocus: false as const,
      refetchOnReconnect: false as const,
    }))
    const queries = {
      dashboardOptions,
    } as unknown as ReadRuntimeContextValue['queries']

    expect(
      createDashboardQueryOptions(queries, {
        fromDate: '2026-09-15',
        toDate: '2026-09-14',
      }).enabled,
    ).toBe(false)
  })

  it('passes exact applied dates and omits an all-terminal selection', () => {
    const dashboardOptions = vi.fn((filters: DashboardFilters) => ({
      queryKey: ['live', 'scope', 1, 'dashboard', filters.fromDate],
      queryFn: vi.fn(),
      enabled: true,
      retry: false as const,
      staleTime: 30_000 as const,
      refetchOnWindowFocus: false as const,
      refetchOnReconnect: false as const,
    }))
    const queries = {
      dashboardOptions,
    } as unknown as ReadRuntimeContextValue['queries']
    const filters = {
      fromDate: '2026-09-09',
      toDate: '2026-09-15',
    }

    createDashboardQueryOptions(queries, filters)

    expect(dashboardOptions).toHaveBeenCalledWith(filters)
    expect(dashboardOptions.mock.calls[0]?.[0]).not.toHaveProperty('terminalId')
  })

  it('derives the recent QR query only from applied dashboard filters', () => {
    expect(
      deriveRecentQrFilters({
        fromDate: '2026-09-09',
        toDate: '2026-09-15',
        terminalId: 'terminal-a',
      }),
    ).toEqual({
      fromDate: '2026-09-09',
      toDate: '2026-09-15',
      terminalId: 'terminal-a',
      status: undefined,
      search: '',
      page: 0,
      size: 10,
    })
  })
})
