import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTrendSeriesPreferences } from './useTrendSeriesPreferences'
import { DEFAULT_TREND_SERIES, type TrendSeriesKey } from './trend-presentation'
import { readTrendSeriesPreferences } from './trend-series-storage'

const state = vi.hoisted(() => ({ visible: undefined as readonly TrendSeriesKey[] | undefined }))
vi.mock('react', async (importOriginal) => ({ ...await importOriginal<typeof import('react')>(), useState: (initialize: () => readonly TrendSeriesKey[]) => {
  state.visible ??= initialize()
  return [state.visible, (next: readonly TrendSeriesKey[]) => { state.visible = next }]
} }))

beforeEach(() => { state.visible = undefined })

describe('Trend series preference lifecycle', () => {
  it('persists checkbox edits and restores them after chart remounts caused by dates or terminal', () => {
    let raw: string | null = null
    const storage = { getItem: () => raw, setItem: vi.fn((_key: string, value: string) => { raw = value }) }
    const initial = useTrendSeriesPreferences(storage)
    expect(initial.visible).toEqual(DEFAULT_TREND_SERIES)
    initial.toggle('uncategorized')
    expect(useTrendSeriesPreferences(storage).visible).toEqual(['success', 'processing', 'failed'])
    expect(readTrendSeriesPreferences(storage)).toEqual(['success', 'processing', 'failed'])
    // A new controller mount restores presentation preferences from storage.
    for (const change of ['global-date', 'terminal', 'page-reload']) {
      state.visible = undefined
      expect(useTrendSeriesPreferences(storage).visible, change).toEqual(['success', 'processing', 'failed'])
    }
    expect(storage.setItem).toHaveBeenCalledTimes(1)
  })

  it('guards the last visible series without writing and keeps local edits when storage fails', () => {
    const storage = { getItem: () => null, setItem: vi.fn(() => { throw new Error('quota') }) }
    for (const key of ['uncategorized', 'processing', 'failed'] as const) useTrendSeriesPreferences(storage).toggle(key)
    expect(useTrendSeriesPreferences(storage).visible).toEqual(['success'])
    storage.setItem.mockClear()
    useTrendSeriesPreferences(storage).toggle('success')
    expect(useTrendSeriesPreferences(storage).visible).toEqual(['success'])
    expect(storage.setItem).not.toHaveBeenCalled()
  })
})

it('does not allow hiding the last available status when saved unknown visibility is unavailable', () => {
  const storage = { getItem: () => JSON.stringify({ version: 1, knownSeries: ['total', 'success', 'processing', 'failed', 'uncategorized'], visible: ['success', 'uncategorized'] }), setItem: vi.fn() }
  const prefs = useTrendSeriesPreferences(storage, ['total', 'success', 'processing', 'failed'])
  prefs.toggle('success')
  expect(storage.setItem).not.toHaveBeenCalled()
})
