import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardFilters, DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { DashboardReadPage } from './DashboardReadPage'
import { useDashboardReadQueries } from './queries'
import { createDashboardFilterState, dashboardFilterReducer } from './filter-state'
import { resetDashboardFilters } from './presenters'
import { formatInstantTime } from '@/shared/presentation/date-time'
import type { DashboardPageHeader } from './DashboardPageHeader'

const observations = vi.hoisted(() => ({
  dashboard: [] as DashboardFilters[],
  recent: [] as DynamicQrFilters[],
  enabled: [] as boolean[],
  terminalError: false,
  dashboardReady: false,
  recentError: false,
  dataUpdatedAt: 0,
  header: undefined as ComponentProps<typeof DashboardPageHeader> | undefined,
  dashboardRefetch: vi.fn(),
  recentRefetch: vi.fn(),
}))

vi.mock('./DashboardPageHeader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./DashboardPageHeader')>()
  return { DashboardPageHeader: (props: ComponentProps<typeof DashboardPageHeader>) => {
    observations.header = props
    return <actual.DashboardPageHeader {...props} />
  } }
})

vi.mock('@/app/read/useReadRuntime', () => ({
  useReadRuntime: () => ({
    readiness: { dashboard: { kind: 'configured' } },
    capabilities: { dashboard: true },
    queries: {
      dashboardOptions: (filters: DashboardFilters) => {
        observations.dashboard.push(filters)
        return { enabled: true, queryKey: ['dashboard'] }
      },
      terminalOptions: () => ({ enabled: true, queryKey: ['terminals'] }),
      dynamicQrOptions: (filters: DynamicQrFilters) => {
        observations.recent.push(filters)
        return { enabled: true, queryKey: ['recent'] }
      },
    },
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled: boolean; queryKey: readonly string[] }) => {
    observations.enabled.push(options.enabled)
    const terminal = options.queryKey[0] === 'terminals'
    const dashboard = options.queryKey[0] === 'dashboard'
    const recentError = options.queryKey[0] === 'recent' && observations.recentError
    return {
      data: dashboard && observations.dashboardReady ? { metrics: {}, pie: [], range: { fromDate: '2026-09-25', toDate: '2026-10-01' }, aggregation: { resolvedGranularity: 'HOUR', allowedGranularities: ['HOUR'] } }
        : terminal && !observations.terminalError ? [{ id: 'terminal-a', name: 'Terminal A' }] : undefined,
      dataUpdatedAt: dashboard ? observations.dataUpdatedAt : 0, isPending: !terminal && !(dashboard && observations.dashboardReady) && !recentError,
      isFetching: false,
      isError: (terminal && observations.terminalError) || recentError,
      refetch: dashboard ? observations.dashboardRefetch : terminal ? vi.fn() : observations.recentRefetch,
    }
  },
}))

// Keep this suite focused on page coordination rather than chart rendering.
vi.mock('./MetricCards', () => ({ MetricCards: () => <div data-test-analytics="metrics" /> }))
vi.mock('./TrendChart', () => ({ TrendChart: () => <div data-test-analytics="trend" /> }))
vi.mock('./StatusDonut', () => ({ StatusDonut: () => <div data-test-analytics="status" /> }))

// Expose the drawer contents in server rendering, where a closed Sheet has no content.
vi.mock('@/shared/ui/FilterDrawer', () => ({
  FilterDrawer: ({ children }: { children: ReactNode }) => <section data-test-drawer="terminal">{children}</section>,
}))

describe('Dashboard filter placement and query coordination', () => {
  beforeEach(() => {
    observations.dashboard = []
    observations.recent = []
    observations.enabled = []
    observations.terminalError = false
    observations.dashboardReady = false
    observations.recentError = false
    observations.dataUpdatedAt = 0
    observations.header = undefined
    observations.dashboardRefetch.mockReset()
    observations.recentRefetch.mockReset()
  })

  it('keeps the query timestamp as the header value and refreshes the same mounted queries', () => {
    const render = () => renderToStaticMarkup(<MemoryRouter>
      <DashboardReadPage initialInstant={new Date('2026-09-30T19:01:00Z')} />
    </MemoryRouter>)
    render()
    expect(observations.header?.updatedAt).toBeUndefined()
    for (const instant of ['2026-10-04T09:47:32Z', '2026-10-04T09:48:12Z']) {
      observations.dataUpdatedAt = Date.parse(instant)
      expect(render()).not.toContain('Oxirgi yangilanish:')
      expect(observations.header?.updatedAt).toBe(formatInstantTime(observations.dataUpdatedAt, {timeZone: 'Asia/Tashkent'}))
    }
    observations.header?.onRefresh()
    expect(observations.dashboardRefetch).toHaveBeenCalledExactlyOnceWith()
    expect(observations.recentRefetch).toHaveBeenCalledExactlyOnceWith()
  })

  it.each([false, true])('keeps analytics before the independent Recent QR panel (error=%s)', (error) => {
    observations.dashboardReady = true
    observations.recentError = error
    const html = renderToStaticMarkup(<MemoryRouter>
      <DashboardReadPage initialInstant={new Date('2026-09-30T19:01:00Z')} />
    </MemoryRouter>)
    const recentStart = html.indexOf('So‘nggi dinamik QRlar</div>')
    for (const section of ['metrics', 'trend', 'status']) {
      const position = html.indexOf(`data-test-analytics="${section}"`)
      expect(position).toBeGreaterThan(0)
      expect(position).toBeLessThan(recentStart)
    }
    expect(html).toContain(error ? 'So‘nggi dinamik QRlarni yuklab bo‘lmadi' : 'So‘nggi dinamik QRlar yuklanmoqda…')
  })

  it('renders compact dates and all presets before a Terminal-only drawer', () => {
    const html = renderToStaticMarkup(<MemoryRouter>
      <DashboardReadPage initialInstant={new Date('2026-09-30T19:01:00Z')} />
    </MemoryRouter>)
    const drawerStart = html.indexOf('<section data-test-drawer="terminal">')
    expect(drawerStart).toBeGreaterThan(0)
    const quick = html.slice(0, drawerStart)
    const drawer = html.slice(drawerStart, html.indexOf('</section>', drawerStart))
    expect(quick).toContain('Sana oralig‘ini tanlash')
    expect(quick).toContain('25.09.2026')
    expect(quick).toContain('01.10.2026')
    expect(quick).not.toContain('Sanalarni qo‘llash')
    for (const days of [1, 7, 30]) expect(quick).toContain(`>${days} kun</button>`)
    expect(drawer).toContain('Barcha terminallar')
    expect(drawer).toContain('Terminal A')
    expect(drawer.match(/<select\b/g)).toHaveLength(1)
    expect(drawer).not.toMatch(/<input\b|Davr presetlari|Sana oralig|\d+ kun|Merchant|Status|Search|Region|District|Bank/)
    expect(observations.dashboard[0]).toEqual({ fromDate: '2026-09-25', toDate: '2026-10-01', granularity: 'AUTO' })
    expect(observations.recent[0]).toEqual({ fromDate: observations.dashboard[0]!.fromDate, toDate: observations.dashboard[0]!.toDate, search: '', status: undefined, page: 0, size: 10 })
  })

  it('coordinates both reads through immediate date commits, Terminal Apply and drawer Reset', () => {
    function Probe({ filters }: { filters: DashboardFilters }) {
      useDashboardReadQueries(filters)
      return null
    }
    const instant = new Date('2026-09-30T19:01:00Z')
    let state = createDashboardFilterState({ ...resetDashboardFilters(instant), terminalId: 'applied-terminal' })
    const inspect = () => {
      renderToStaticMarkup(<Probe filters={state.applied} />)
      expect(observations.dashboard.at(-1)).toEqual({ ...state.applied, granularity: state.requestedGranularity })
      expect(observations.recent.at(-1)).toEqual({ ...state.applied, search: '', status: undefined, page: 0, size: 10 })
    }
    state = dashboardFilterReducer(state, { type: 'date-draft', range: { fromDate: '2026-09-01', toDate: '2026-09-10' } })
    state = dashboardFilterReducer(state, { type: 'terminal-draft', terminalId: 'draft-terminal' })
    inspect()
    expect(observations.dashboard.at(-1)?.terminalId).toBe('applied-terminal')
    expect(observations.dashboard.at(-1)?.fromDate).toBe('2026-09-25')
    state = dashboardFilterReducer(state, { type: 'commit-dates', range: state.dateDraft })
    inspect()
    expect(state.terminalDraft).toBe('applied-terminal')
    state = dashboardFilterReducer(state, { type: 'terminal-draft', terminalId: 'draft-terminal' })
    state = dashboardFilterReducer(state, { type: 'apply-terminal' })
    inspect()
    expect(observations.dashboard.at(-1)?.terminalId).toBe('draft-terminal')
    state = dashboardFilterReducer(state, { type: 'reset', filters: resetDashboardFilters(instant) })
    inspect()
    expect(observations.dashboard.at(-1)).toEqual({ fromDate: '2026-09-25', toDate: '2026-10-01', granularity: 'AUTO' })
  })

  it('keeps Dashboard and recent reads enabled when the Terminal lookup fails', () => {
    observations.terminalError = true
    function Probe() {
      const queries = useDashboardReadQueries({ fromDate: '2026-09-25', toDate: '2026-10-01', terminalId: 'owned-terminal' })
      return <output data-dashboard={String(queries.enabled.dashboard)} data-recent={String(queries.enabled.recent)} />
    }
    expect(renderToStaticMarkup(<Probe />)).toContain('data-dashboard="true" data-recent="true"')
    expect(observations.enabled).toEqual([true, true, true])
    expect(observations.recent[0]?.terminalId).toBe('owned-terminal')
  })
})

// Exercise feature option/state contracts independently of the closed portal.
vi.mock('@/components/ui/select', async () => ({
  Select: (await import('@/test/select-contract')).SelectContract,
}))
