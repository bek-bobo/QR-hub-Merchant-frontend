import { useState } from 'react'
import { toggleTrendSeries, type TrendSeriesKey } from './trend-presentation'
import { getBrowserTrendSeriesStorage, readTrendSeriesPreferences, writeTrendSeriesPreferences, type TrendSeriesStorage } from './trend-series-storage'

export function useTrendSeriesPreferences(storage: TrendSeriesStorage | undefined = getBrowserTrendSeriesStorage()) {
  const [visible, setVisible] = useState(() => readTrendSeriesPreferences(storage))

  function toggle(key: TrendSeriesKey) {
    const next = toggleTrendSeries(visible, key)
    if (next === visible) return
    setVisible(next)
    writeTrendSeriesPreferences(storage, next)
  }

  return { visible, toggle }
}
