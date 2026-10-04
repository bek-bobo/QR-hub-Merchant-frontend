import { describe, expect, it } from 'vitest'
import { ALL_TREND_SERIES } from './trend-presentation'
import { readTrendSeriesPreferences, writeTrendSeriesPreferences, TREND_SERIES_STORAGE_KEY, type TrendSeriesStorage } from './trend-series-storage'

function memoryStorage(raw: string | null = null): TrendSeriesStorage {
  const entries = new Map<string, string>()
  if (raw !== null) entries.set(TREND_SERIES_STORAGE_KEY, raw)
  return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value) } }
}

describe('Trend series storage', () => {
  it('defaults to all four and persists/restores stable IDs in their canonical order', () => {
    const storage = memoryStorage()
    expect(readTrendSeriesPreferences(storage)).toEqual(ALL_TREND_SERIES)
    writeTrendSeriesPreferences(storage, ['failed', 'success'])
    expect(readTrendSeriesPreferences(storage)).toEqual(['success', 'failed'])
    expect(JSON.parse(storage.getItem(TREND_SERIES_STORAGE_KEY)!)).toEqual({
      version: 1, knownSeries: ALL_TREND_SERIES, visible: ['success', 'failed'],
    })
  })

  it.each(['{', 'null', '[]', '42', '{}', '{"version":2}',
    '{"version":1,"visible":[],"knownSeries":["total"]}',
    '{"version":1,"visible":["unknown"],"knownSeries":["unknown"]}',
    '{"version":1,"visible":[42],"knownSeries":["total"]}',
    '{"version":1,"visible":["total"],"knownSeries":null}',
  ])('restores all visible for malformed or unusable storage: %s', (raw) => {
    expect(readTrendSeriesPreferences(memoryStorage(raw))).toEqual(ALL_TREND_SERIES)
  })

  it('ignores unknown/duplicate IDs while preserving intentional hidden series', () => {
    const raw = JSON.stringify({ version: 1, knownSeries: ALL_TREND_SERIES, visible: ['success', 'unknown', 'success'] })
    expect(readTrendSeriesPreferences(memoryStorage(raw))).toEqual(['success'])
  })

  it('defaults newly introduced IDs to visible without restoring existing hidden IDs', () => {
    const raw = JSON.stringify({ version: 1, knownSeries: ['total', 'success', 'processing'], visible: ['success'] })
    expect(readTrendSeriesPreferences(memoryStorage(raw))).toEqual(['success', 'failed'])
  })

  it('restores defaults for empty writes and tolerates unavailable or denied storage', () => {
    const storage = memoryStorage()
    writeTrendSeriesPreferences(storage, [])
    expect(readTrendSeriesPreferences(storage)).toEqual(ALL_TREND_SERIES)
    const denied = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } }
    expect(readTrendSeriesPreferences(denied)).toEqual(ALL_TREND_SERIES)
    expect(readTrendSeriesPreferences(undefined)).toEqual(ALL_TREND_SERIES)
    expect(() => writeTrendSeriesPreferences(denied, ['success'])).not.toThrow()
    expect(() => writeTrendSeriesPreferences(undefined, ['success'])).not.toThrow()
  })
})
