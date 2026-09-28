import { useQuery } from '@tanstack/react-query'
import { useReadRuntime, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import type {
  DashboardFilters,
  DynamicQrFilters,
} from '@/shared/contracts/merchant-read'
import { isValidDateRange } from '@/shared/filters/date-range'

type ReadQueries = ReadRuntimeContextValue['queries']

export function createDashboardQueryOptions(
  queries: ReadQueries,
  filters: DashboardFilters,
) {
  const options = queries.dashboardOptions(filters)
  return {
    ...options,
    enabled: options.enabled && isValidDateRange(filters),
  }
}

export function deriveRecentQrFilters(
  filters: DashboardFilters,
): DynamicQrFilters {
  return Object.freeze({
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    ...(filters.terminalId ? { terminalId: filters.terminalId } : {}),
    status: undefined,
    search: '',
    page: 0,
    size: 10,
  })
}

export function useDashboardReadQueries(applied: DashboardFilters) {
  const runtime = useReadRuntime()
  const dashboardOptions = createDashboardQueryOptions(runtime.queries, applied)
  const baseTerminalOptions = runtime.queries.terminalOptions()
  const terminalOptions = {
    ...baseTerminalOptions,
    enabled: baseTerminalOptions.enabled && dashboardOptions.enabled,
  }
  const recentFilters = deriveRecentQrFilters(applied)
  const baseRecentOptions = runtime.queries.dynamicQrOptions(recentFilters)
  const recentOptions = {
    ...baseRecentOptions,
    enabled:
      baseRecentOptions.enabled &&
      dashboardOptions.enabled &&
      isValidDateRange(applied),
  }

  return {
    runtime,
    dashboard: useQuery(dashboardOptions),
    terminals: useQuery(terminalOptions),
    recent: useQuery(recentOptions),
    enabled: {
      dashboard: dashboardOptions.enabled,
      terminals: terminalOptions.enabled,
      recent: recentOptions.enabled,
    },
  }
}
