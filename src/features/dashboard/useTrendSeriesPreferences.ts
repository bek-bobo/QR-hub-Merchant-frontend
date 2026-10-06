import { useState } from 'react'
import { ALL_TREND_SERIES, visibleTrendSeries, toggleTrendSeries, type TrendSeriesKey } from './trend-presentation'
import { getBrowserTrendSeriesStorage, readTrendSeriesPreferences, writeTrendSeriesPreferences, type TrendSeriesStorage } from './trend-series-storage'

export function useTrendSeriesPreferences(storage: TrendSeriesStorage | undefined = getBrowserTrendSeriesStorage(), available: readonly TrendSeriesKey[] = ALL_TREND_SERIES) {
  const [visible, setVisible] = useState(() => readTrendSeriesPreferences(storage))

  function toggle(key: TrendSeriesKey) {
    const effective = visibleTrendSeries(visible, available)
    if (!available.includes(key) || (effective.includes(key) && effective.length === 1)) return
    const next = toggleTrendSeries(visible, key)
    if (next === visible) return
    setVisible(next)
    writeTrendSeriesPreferences(storage, next)
  }

  return { visible, toggle }
}
