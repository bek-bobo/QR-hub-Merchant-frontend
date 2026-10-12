import { ALL_TREND_SERIES, DEFAULT_TREND_SERIES, type TrendSeriesKey } from './trend-presentation'

export const TREND_SERIES_STORAGE_KEY = 'qrhub:dashboard-trend-series:v1'

export interface TrendSeriesStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function getBrowserTrendSeriesStorage(): TrendSeriesStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function readTrendSeriesPreferences(storage: TrendSeriesStorage | undefined): readonly TrendSeriesKey[] {
  try {
    const raw = storage?.getItem(TREND_SERIES_STORAGE_KEY)
    if (!raw) return DEFAULT_TREND_SERIES
    const saved: unknown = JSON.parse(raw)
    if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return DEFAULT_TREND_SERIES
    const entry = saved as Record<string, unknown>
    if (entry.version !== 1 || !Array.isArray(entry.visible) || !Array.isArray(entry.knownSeries)
      || !entry.visible.every((key) => typeof key === 'string')
      || !entry.knownSeries.every((key) => typeof key === 'string')) return DEFAULT_TREND_SERIES
    const visibleIds = entry.visible
    const knownIds = entry.knownSeries
    const selected = ALL_TREND_SERIES.filter((key) => visibleIds.includes(key))
    if (selected.length === 0) return DEFAULT_TREND_SERIES
    // A newly introduced series defaults to visible; existing hidden IDs stay hidden.
    return ALL_TREND_SERIES.filter((key) => selected.includes(key)
      || (!knownIds.includes(key) && DEFAULT_TREND_SERIES.includes(key)))
  } catch {
    return DEFAULT_TREND_SERIES
  }
}

export function writeTrendSeriesPreferences(storage: TrendSeriesStorage | undefined, visible: readonly TrendSeriesKey[]): void {
  const selected = ALL_TREND_SERIES.filter((key) => visible.includes(key))
  try {
    storage?.setItem(TREND_SERIES_STORAGE_KEY, JSON.stringify({
      version: 1, knownSeries: ALL_TREND_SERIES,
      visible: selected.length > 0 ? selected : DEFAULT_TREND_SERIES,
    }))
  } catch {
    // Storage denial/quota must not prevent local presentation changes.
  }
}
