import { Children, isValidElement, type ReactNode, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardFilters, DashboardView } from '@/shared/contracts/merchant-read'
import { readKeys } from '@/shared/api/read-keys'
import { deriveRecentQrFilters } from './queries'
import { ChartLocalDateFilter, ChartRangeController } from './ChartLocalDateFilter'
import { chartGlobalContextKey, chartPresetRange } from './chart-range'
import { createDashboardFilterState, dashboardFilterReducer } from './filter-state'
import { getTashkentDatePreset, getTashkentYearPreset } from '@/shared/filters/date-range'

const harness = vi.hoisted(() => ({
  states: [] as unknown[], cursor: 0, requests: [] as { enabled: boolean; queryKey: unknown }[],
  local: undefined as DashboardView | undefined, fetching: false, error: false, retry: vi.fn(),
}))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = harness.cursor++
    if (index >= harness.states.length) harness.states[index] = initial
    return [harness.states[index], (next: unknown) => { harness.states[index] = next }]
  },
}))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: () => ({ queries: {
  dashboardOptions: (filters: DashboardFilters) => ({ enabled: true,
    queryKey: readKeys.dashboard({ source: 'live', sessionScopeId: 'session', accessRevision: 1 }, filters),
  }),
} }) }))
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: { enabled: boolean; queryKey: unknown }) => {
  harness.requests.push(options)
  return { data: harness.local, isFetching: harness.fetching, isError: harness.error, refetch: harness.retry }
} }))
vi.mock('./TrendChart', () => ({ TrendChart: ({ rangeControls, feedback }: { rangeControls: ReactNode; feedback: ReactNode }) =>
  <section>{rangeControls}{feedback}</section> }))
vi.mock('@/features/dynamic-qr/DateRangeQuickFilter', () => ({ DateRangeQuickFilter: () => <span>Davr…</span> }))

const globalFilters = { fromDate: '2026-09-01', toDate: '2026-09-30', terminalId: 'terminal-a' }
const instant = new Date('2026-10-02T20:00:00Z')
const globalView = { chartGroupBy: 'WEEK', buckets: [], metrics: {}, pie: {} } as unknown as DashboardView

function renderController(filters: DashboardFilters = globalFilters) {
  harness.cursor = 0
  return ChartRangeController({ view: globalView, filters, initialInstant: instant })
}
function find(node: ReactNode, predicate: (element: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue
    if (predicate(child)) return child
    const nested = find(child.props.children as ReactNode, predicate)
    if (nested) return nested
  }
  return undefined
}
function click(label: string) {
  const tree = renderController()
  const button = find(tree.props.rangeControls, (element) => element.props.children === label)!
  const handler = button.props.onClick as () => void
  handler()
}

beforeEach(() => { harness.states = []; harness.cursor = 0; harness.requests = []; harness.local = undefined; harness.fetching = false; harness.error = false; vi.clearAllMocks() })

describe('chart-local dates', () => {
  it.each([
    ['2024-02-29T00:00:00Z', '2023-03-02', '2024-02-29'],
    ['2025-02-28T00:00:00Z', '2024-03-01', '2025-02-28'],
    ['2026-10-02T20:00:00Z', '2025-10-04', '2026-10-03'],
  ])('uses exactly 365 inclusive local chart dates at %s', (utc, fromDate, toDate) => {
    const range = chartPresetRange('1y', new Date(utc))
    expect(range).toEqual({ fromDate, toDate })
    expect((Date.parse(range.toDate) - Date.parse(range.fromDate)) / 86_400_000 + 1).toBe(365)
  })

  it('keeps the shared calendar-year helper unchanged at a leap boundary', () => {
    const leapDay = new Date('2024-02-29T00:00:00Z')
    expect(getTashkentYearPreset(leapDay)).toEqual({ fromDate: '2023-03-01', toDate: '2024-02-29' })
    expect(chartPresetRange('1y', leapDay)).toEqual({ fromDate: '2023-03-02', toDate: '2024-02-29' })
  })

  it('defaults to global data with the identical network query disabled', () => {
    const chart = renderController()
    expect(harness.states[0]).toBe('dashboard')
    expect(chart.props.view).toBe(globalView)
    expect(chart.props.plotUnavailable).toBe(false)
    expect(harness.requests[0]!.enabled).toBe(false)
  })

  it.each([
    ['7 kun', '7d', '2026-09-27'], ['30 kun', '30d', '2026-09-04'], ['1 yil', '1y', '2025-10-04'],
  ] as const)('%s affects only chart dates and retains the globally applied terminal', (label, mode, fromDate) => {
    const recentBefore = deriveRecentQrFilters(globalFilters)
    const original = JSON.stringify([globalFilters, globalView])
    click(label)
    harness.local = { ...globalView, chartGroupBy: 'MONTH' }
    const chart = renderController()
    expect(harness.states[0]).toBe(mode)
    expect(chartPresetRange(mode, instant)).toEqual({ fromDate, toDate: '2026-10-03' })
    const query = harness.requests.at(-1)!
    expect(query.enabled).toBe(true)
    expect(query.queryKey).toEqual(['live', 'session', 1, 'dashboard', fromDate, '2026-10-03', 'terminal-a'])
    expect(chart.props.view).toBe(harness.local)
    expect(deriveRecentQrFilters(globalFilters)).toEqual(recentBefore)
    expect(JSON.stringify([globalFilters, globalView])).toBe(original)
    click('Dashboard davri')
    expect(renderController().props.view).toBe(globalView)
    expect(harness.requests.at(-1)!.enabled).toBe(false)
  })

  it('validates complete custom dates and disables a duplicate request for the global range', () => {
    const chart = renderController()
    const calendar = find(chart.props.rangeControls, (element) => typeof element.props.onDraftChange === 'function')!
    const apply = calendar.props.onApply as (range: { fromDate: string; toDate: string }) => void
    for (const invalid of [{ fromDate: '', toDate: '2026-10-01' }, { fromDate: '2026-02-30', toDate: '2026-03-01' }, { fromDate: '2026-10-02', toDate: '2026-10-01' }]) {
      apply(invalid)
      renderController()
      expect(harness.requests.at(-1)!.enabled).toBe(false)
      expect(harness.states[0]).toBe('dashboard')
    }
    apply({ fromDate: '2026-08-01', toDate: '2026-08-03' })
    renderController()
    expect(harness.requests.at(-1)!.queryKey).toEqual(['live', 'session', 1, 'dashboard', '2026-08-01', '2026-08-03', 'terminal-a'])
    expect(harness.requests.at(-1)!.enabled).toBe(true)
    apply(globalFilters)
    expect(renderController().props.view).toBe(globalView)
    expect(harness.requests.at(-1)!.enabled).toBe(false)
  })

  it.each(['fromDate', 'toDate', 'terminalId'] as const)('replaces the chart controller and resets overrides when global %s changes', (field) => {
    click('7 kun')
    const changed = { ...globalFilters, [field]: field === 'terminalId' ? 'terminal-b' : '2026-09-15' }
    const originalKey = ChartLocalDateFilter({ view: globalView, filters: globalFilters }).key
    const next = ChartLocalDateFilter({ view: globalView, filters: changed })
    expect(next.key).not.toBe(originalKey)
    expect(next.key).toBe(chartGlobalContextKey(changed))
    // React remounts a keyed controller; initialize its state as on that remount.
    harness.states = []
    expect(renderController(changed).props.view).toBe(globalView)
    expect(harness.states[0]).toBe('dashboard')
    expect(harness.requests.at(-1)!.enabled).toBe(false)
  })

  it.each([
    ['custom', { fromDate: '2026-08-01', toDate: '2026-08-10' }],
    ['Today', getTashkentDatePreset(1, instant)],
    ['7 days', getTashkentDatePreset(7, instant)],
    ['30 days', getTashkentDatePreset(30, instant)],
    ['date Reset', getTashkentDatePreset(7, instant)],
  ] as const)('returns an active local override to Dashboard range after a global %s commit', (_label, range) => {
    click('1 yil')
    renderController()
    expect(harness.requests.at(-1)!.enabled).toBe(true)
    const originalKey = ChartLocalDateFilter({ view: globalView, filters: globalFilters }).key
    const state = dashboardFilterReducer(createDashboardFilterState(globalFilters), { type: 'commit-dates', range })
    const next = ChartLocalDateFilter({ view: globalView, filters: state.applied })
    expect(next.key).not.toBe(originalKey)
    expect(state.applied.terminalId).toBe('terminal-a')
    // Simulate React's remount at the changed global-context key.
    harness.states = []
    const chart = renderController(state.applied)
    expect(harness.states[0]).toBe('dashboard')
    expect(chart.props.view).toBe(globalView)
    expect(harness.requests.at(-1)!.enabled).toBe(false)
    const controls = renderToStaticMarkup(chart)
    for (const label of ['Dashboard davri', '7 kun', '30 kun', '1 yil', 'Davr…']) expect(controls).toContain(label)
    // A subsequent local selection remains isolated from global and Recent QR filters.
    const recent = deriveRecentQrFilters(state.applied)
    const button = find(chart.props.rangeControls, (element) => element.props.children === '1 yil')!
    ;(button.props.onClick as () => void)()
    renderController(state.applied)
    expect(harness.requests.at(-1)!.enabled).toBe(true)
    expect(deriveRecentQrFilters(state.applied)).toEqual(recent)
    expect(state.applied).toEqual({ ...range, terminalId: 'terminal-a' })
  })

  it('contains pending/error feedback and preserves retained local data on refresh failure', () => {
    click('7 kun')
    harness.fetching = true
    let chart = renderController()
    expect(chart.props.plotUnavailable).toBe(true)
    expect(renderToStaticMarkup(chart)).toContain('Grafik yuklanmoqda')
    harness.fetching = false
    harness.error = true
    chart = renderController()
    expect(renderToStaticMarkup(chart)).toContain('Grafikni yuklab bo‘lmadi')
    harness.local = { ...globalView, chartGroupBy: 'DAY' }
    chart = renderController()
    expect(chart.props.plotUnavailable).toBe(false)
    expect(chart.props.view).toBe(harness.local)
    expect(renderToStaticMarkup(chart)).toContain('Avval yuklangan ma’lumotlar')
  })
})
