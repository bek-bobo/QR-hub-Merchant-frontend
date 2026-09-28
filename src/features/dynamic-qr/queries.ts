import { useQuery } from '@tanstack/react-query'
import {
  useReadRuntime,
  type ReadRuntimeContextValue,
} from '@/app/read/useReadRuntime'
import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { isValidDateRange } from '@/shared/filters/date-range'
import {
  getTerminalFilterState,
  type TerminalFilterState,
} from './page-state'

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

export function useDynamicQrReadQueries(applied: DynamicQrFilters) {
  const runtime = useReadRuntime()
  const baseListOptions = runtime.queries.dynamicQrOptions(applied)
  const baseTerminalOptions = runtime.queries.terminalOptions()
  const terminalOptions = {
    ...baseTerminalOptions,
    enabled: baseTerminalOptions.enabled && baseListOptions.enabled,
  }
  const terminals = useQuery(terminalOptions)
  const terminalFilterState = getTerminalFilterState(applied, {
    lookupEnabled: terminalOptions.enabled,
    lookupPending: terminals.isPending,
    lookupError: terminals.isError,
    terminals: terminals.data,
  })
  const listOptions = createDynamicQrQueryOptions(
    runtime.queries,
    applied,
    terminalFilterState,
  )

  return {
    runtime,
    terminals,
    list: useQuery(listOptions),
    terminalFilterState,
    enabled: {
      list: listOptions.enabled,
      terminals: terminalOptions.enabled,
    },
  }
}
