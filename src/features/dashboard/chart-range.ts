import type { DashboardFilters, DateRange } from '@/shared/contracts/merchant-read'
import { getTashkentDatePreset } from '@/shared/filters/date-range'

export type ChartRangeMode = 'dashboard' | '7d' | '30d' | '1y' | 'custom'

export function chartGlobalContextKey(filters: DashboardFilters): string {
  return JSON.stringify([filters.fromDate, filters.toDate, filters.terminalId ?? null])
}

export function chartPresetRange(mode: '7d' | '30d' | '1y', instant = new Date()): DateRange {
  if (mode !== '1y') return getTashkentDatePreset(mode === '7d' ? 7 : 30, instant)
  // Only the chart-local year is fixed to 365 inclusive Tashkent dates.
  const { toDate } = getTashkentDatePreset(1, instant)
  const start = new Date(`${toDate}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - 364)
  return Object.freeze({ fromDate: start.toISOString().slice(0, 10), toDate })
}

export function chartRequestFilters(global: DashboardFilters, range: DateRange): DashboardFilters {
  return { ...range, ...(global.terminalId ? { terminalId: global.terminalId } : {}) }
}

export function chartRangeDiffers(global: DashboardFilters, local: DashboardFilters): boolean {
  return global.fromDate !== local.fromDate || global.toDate !== local.toDate
}

