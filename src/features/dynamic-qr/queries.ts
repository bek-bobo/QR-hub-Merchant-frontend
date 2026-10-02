import { useQuery } from '@tanstack/react-query'
import {
  useReadRuntime,
  type ReadRuntimeContextValue,
} from '@/app/read/useReadRuntime'
import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { isValidDateRange } from '@/shared/filters/date-range'
import type { TerminalFilterState } from './page-state'
import { useDynamicQrFilterLookups } from './filter-lookups'
import type { DynamicQrAdvancedFilterDraft } from './quick-filters'
import { getRuntimeFeatureConfig, type RuntimeFeatureConfig } from '@/shared/config/runtime'

type ReadQueries = ReadRuntimeContextValue['queries']

export function createDynamicQrQueryOptions(
  queries: ReadQueries,
  filters: DynamicQrFilters,
  terminalFilterState: TerminalFilterState,
) {
  const options = queries.dynamicQrOptions(filters)
  return {
    ...options,
    enabled:
      options.enabled &&
      terminalFilterState === 'valid' &&
      isValidDateRange(filters),
  }
}

export function useDynamicQrReadQueries(applied: DynamicQrFilters, draft: DynamicQrAdvancedFilterDraft = applied) {
    const runtime = useReadRuntime()
    const runtimeConfig = getRuntimeFeatureConfig()
    const baseListOptions = runtime.queries.dynamicQrOptions(applied)
    const lookups = useDynamicQrFilterLookups(draft, applied, baseListOptions.enabled)
    const { terminalFilterState } = lookups

    const listOptions = createDynamicQrQueryOptions(
        runtime.queries,
        applied,
        lookups.appliedFilterState,
    )

    const guardedStatsOptions = createDynamicQrStatsQueryOptions(
        runtime.queries, applied, terminalFilterState, runtimeConfig,
    )
    const list = useQuery(listOptions)
    const stats = useQuery(guardedStatsOptions)

    return {
        runtime,
        terminals: lookups.appliedTerminals,
        lookups,
        filterState: lookups.appliedFilterState,
        list,
        stats,
        statsFeatureEnabled: runtimeConfig.dynamicQrStatsEnabled,
        terminalFilterState,
        enabled: {
            list: listOptions.enabled,
            stats: guardedStatsOptions.enabled,
            terminals: lookups.draftEvidence.terminals.enabled,
        },
    }
}

export function createDynamicQrStatsQueryOptions(
  queries: ReadQueries,
  filters: DynamicQrFilters,
  terminalFilterState: TerminalFilterState,
  runtimeConfig: RuntimeFeatureConfig = getRuntimeFeatureConfig(),
) {
  const options = queries.dynamicQrStatsOptions({
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    terminalId: filters.terminalId,
  })
  return {
    ...options,
    enabled:
      runtimeConfig.dynamicQrStatsEnabled === true &&
      options.enabled &&
      terminalFilterState === 'valid' &&
      isValidDateRange(filters),
  }
}
