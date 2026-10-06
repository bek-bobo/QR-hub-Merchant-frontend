import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLiveReadApi } from '@/app/read/createLiveReadApi'
import { readKeys } from '@/shared/api/read-keys'
import type { DashboardRequest, DashboardView, ChartGroupBy, DynamicQrFilters, ReadScope } from '@/shared/contracts/merchant-read'
import { dashboardMetadata, dashboardZero } from './test-fixtures'
import { DashboardReadPage } from './DashboardReadPage'
import type { DashboardQuickDateFilter } from './DashboardQuickDateFilter'
import { dashboardFilterReducer, type DashboardFilterAction, type DashboardFilterState } from './filter-state'

interface CapturedQuery {
  queryKey: readonly unknown[]
  queryFn?: (context: { signal: AbortSignal }) => Promise<unknown>
}

const flow = vi.hoisted(() => ({
  state: null as DashboardFilterState | null,
  controls: null as ComponentProps<typeof DashboardQuickDateFilter> | null,
  selectDate: null as ((date: string) => void) | null,
  apply: null as (() => void) | null,
  filterApply: null as (() => void) | null,
  terminalChange: null as ((terminalId?: string) => void) | null,
  terminalReset: null as (() => void) | null,
  drawerOpenChange: null as ((open: boolean) => void) | null,
  refresh: null as (() => void) | null,
  refreshed: [] as (readonly unknown[])[],
  queries: [] as CapturedQuery[],
  selectGranularity: null as ((value: ChartGroupBy) => void) | null,
  view: null as DashboardView | null,
  cards: null as DashboardView['metrics'] | null,
  chart: null as DashboardView | null,
  donut: null as DashboardView['pie'] | null,
  get: vi.fn().mockResolvedValue(undefined),
}))

function findHandler(node: ReactNode, prop: string, label?: string): ((value?: string) => void) | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue
    // Footer actions include decorative icons alongside their visible text.
    const text = Children.toArray(child.props.children as ReactNode)
      .filter((part) => typeof part === 'string' || typeof part === 'number').join('').trim()
    if (typeof child.props[prop] === 'function' && (label === undefined || text === label)) {
      return child.props[prop] as (value?: string) => void
    }
    const nested = findHandler(child.props.children as ReactNode, prop, label)
    if (nested) return nested
  }
  return null
}

// Persist the real page reducer across server renders; all other hooks stay real.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, useReducer: (...args: unknown[]) => {
    if (args[0] !== dashboardFilterReducer) return Reflect.apply(actual.useReducer, undefined, args)
    flow.state ??= (args[2] as (arg: unknown) => DashboardFilterState)(args[1])
    return [flow.state, (action: DashboardFilterAction) => {
      flow.state = dashboardFilterReducer(flow.state!, action)
    }]
  } }
})

vi.mock('./DashboardQuickDateFilter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./DashboardQuickDateFilter')>()
  return { DashboardQuickDateFilter: (props: ComponentProps<typeof actual.DashboardQuickDateFilter>) => {
    flow.controls = props
    const tree = actual.DashboardQuickDateFilter(props)
    flow.apply = findHandler(tree, 'onClick', 'Sanalarni qo‘llash')
    return tree
  } }
})

vi.mock('@/features/dynamic-qr/DateRangeQuickFilter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/dynamic-qr/DateRangeQuickFilter')>()
  return { DateRangeQuickFilter: (props: ComponentProps<typeof actual.DateRangeQuickFilter>) => {
    const tree = actual.DateRangeQuickFilter(props)
    flow.selectDate = findHandler(tree, 'onSelect')
    return tree
  } }
})

vi.mock('@/shared/ui/FilterDrawer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/FilterDrawer')>()
  return { FilterDrawer: (props: ComponentProps<typeof actual.FilterDrawer>) => {
    const tree = actual.FilterDrawer(props)
    flow.filterApply = findHandler(tree, 'onClick', 'Qo‘llash')
    flow.terminalReset = findHandler(tree, 'onClick', 'Qayta tiklash')
    flow.drawerOpenChange = tree.props.onOpenChange
    flow.terminalChange = findHandler(props.children, 'onChange')
    return tree
  } }
})

vi.mock('./DashboardPageHeader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./DashboardPageHeader')>()
  return { DashboardPageHeader: (props: ComponentProps<typeof actual.DashboardPageHeader>) => {
    flow.refresh = props.onRefresh
    return <actual.DashboardPageHeader {...props} />
  } }
})

const scope: ReadScope = { source: 'live', sessionScopeId: 'date-flow', accessRevision: 1 }
const api = createLiveReadApi({ webBaseUrl: 'https://merchant.example/qh-merchant-web-api',
  environment: 'production', bridge: { get: flow.get } })

vi.mock('@/app/read/useReadRuntime', () => ({
  useReadRuntime: () => ({
    readiness: { dashboard: { kind: 'configured' } }, capabilities: { dashboard: true },
    queries: {
      dashboardOptions: (filters: DashboardRequest) => ({ enabled: true,
        queryKey: readKeys.dashboard(scope, filters),
        queryFn: ({ signal }: { signal: AbortSignal }) => api.dashboard(filters, signal) }),
      dynamicQrOptions: (filters: DynamicQrFilters) => ({ enabled: true,
        queryKey: readKeys.dynamicQrs(scope, filters),
        queryFn: ({ signal }: { signal: AbortSignal }) => api.dynamicQrs(filters, signal) }),
      terminalOptions: () => ({ enabled: true, queryKey: readKeys.terminals(scope) }),
    },
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: CapturedQuery) => {
    flow.queries.push(options)
    return { data: options.queryKey[3] === 'dashboard' ? flow.view : undefined, dataUpdatedAt: 0, isPending: !(options.queryKey[3] === 'dashboard' && flow.view), isError: false,
      isFetching: false, refetch: vi.fn(async () => { flow.refreshed.push(options.queryKey) }) }
  },
}))

const instant = new Date('2026-09-30T19:01:00Z')
function renderPage() {
  flow.queries = []
  return renderToStaticMarkup(<MemoryRouter><DashboardReadPage initialInstant={instant} /></MemoryRouter>)
}
function dataQueries() {
  return flow.queries.filter(({ queryKey }) => ['dashboard', 'dynamic-qrs'].includes(String(queryKey[3])))
}
async function requests() {
  flow.get.mockClear()
  for (const query of dataQueries()) await query.queryFn!({ signal: new AbortController().signal })
  return flow.get.mock.calls.map(([request]) => request)
}

beforeEach(() => {
  flow.view = null; flow.selectGranularity = null; flow.cards = null; flow.chart = null; flow.donut = null
  flow.state = null; flow.controls = null; flow.selectDate = null; flow.apply = null; flow.filterApply = null
  flow.terminalChange = null
  flow.terminalReset = null; flow.drawerOpenChange = null; flow.refresh = null; flow.refreshed = []
  vi.clearAllMocks()
})

describe('Dashboard rendered date controls to read requests', () => {
  it('wires drawer cancellation, draft Reset and Apply without changing date inputs', () => {
    renderPage()
    expect(flow.filterApply).toBeTypeOf('function')
    expect(flow.terminalReset).toBeTypeOf('function')
    expect(flow.terminalChange).toBeTypeOf('function')
    flow.drawerOpenChange!(true)
    flow.terminalChange!('T1')
    renderPage()
    expect(flow.state!.applied.terminalId).toBeUndefined()
    dataQueries().forEach(({ queryKey }) => expect(queryKey[6]).not.toBe('T1'))
    flow.filterApply!()
    renderPage()
    const applied = flow.state!.applied
    expect(applied.terminalId).toBe('T1')
    const dateDraft = flow.state!.dateDraft
    flow.drawerOpenChange!(true)
    flow.terminalChange!('T2')
    flow.drawerOpenChange!(false)
    flow.drawerOpenChange!(true)
    expect(flow.state!.terminalDraft).toBe('T1')
    expect(flow.state!.applied).toBe(applied)
    expect(flow.state!.dateDraft).toBe(dateDraft)
    flow.terminalReset!()
    renderPage()
    expect(flow.state!.terminalDraft).toBeUndefined()
    expect(flow.state!.applied).toBe(applied)
    dataQueries().forEach(({ queryKey }) => expect(queryKey[6]).toBe('T1'))
    flow.filterApply!()
    renderPage()
    expect(flow.state!.applied).toEqual({ fromDate: applied.fromDate, toDate: applied.toDate })
    expect(flow.state!.dateDraft).toBe(dateDraft)
    dataQueries().forEach(({ queryKey }) => expect(queryKey[6]).not.toBe('T1'))
  })

  it('refreshes the applied context without committing or discarding an open terminal edit', () => {
    renderPage()
    flow.drawerOpenChange!(true)
    flow.terminalChange!('T1')
    renderPage()
    flow.filterApply!()
    renderPage()
    flow.drawerOpenChange!(true)
    flow.terminalChange!('T2')
    renderPage()
    const applied = flow.state!.applied
    flow.refresh!()
    expect(flow.refreshed).toHaveLength(2)
    flow.refreshed.forEach((queryKey) => expect(queryKey[6]).toBe('T1'))
    expect(flow.state!.applied).toBe(applied)
    expect(flow.state!.terminalDraft).toBe('T2')
  })

  it('keeps incomplete drafts out of queries and commits calendar completion immediately to both reads', async () => {
    renderPage()
    // Terminal is already applied; pending terminal edits must not leak into date commits.
    flow.drawerOpenChange!(true)
    flow.terminalChange!('terminal-a')
    renderPage()
    flow.filterApply!()
    flow.drawerOpenChange!(true)
    flow.terminalChange!('terminal-b')
    renderPage()
    const initialKeys = dataQueries().map(({ queryKey }) => queryKey)
    const initialRequests = await requests()

    expect(flow.selectDate).toBeTypeOf('function')
    flow.selectDate!('2026-08-01')
    renderPage()
    expect(flow.state!.dateDraft).toEqual({ fromDate: '2026-08-01', toDate: '' })
    expect(dataQueries().map(({ queryKey }) => queryKey)).toEqual(initialKeys)
    flow.selectDate!('2026-08-10')
    renderPage()
    const complete = { fromDate: '2026-08-01', toDate: '2026-08-10' }
    expect(flow.controls!.range).toEqual(complete)
    expect(flow.apply).toBeNull()
    expect(flow.state!.applied).toEqual({ ...complete, terminalId: 'terminal-a' })
    expect(flow.state!.terminalDraft).toBe('terminal-a')
    dataQueries().forEach(({ queryKey }, index) => expect(queryKey).not.toEqual(initialKeys[index]))
    const changedRequests = await requests()
    expect(changedRequests.map(({ endpoint }) => endpoint.path)).toEqual(['/dashboard/transactions', '/dynamic-qrs/get-all'])
    expect(changedRequests[0].query).toEqual({ ...complete, terminalId: 'terminal-a', granularity: 'AUTO' })
    expect(changedRequests[1].query).toEqual({ ...complete, terminalId: 'terminal-a', page: '0', size: '10' })
    expect(changedRequests[0].query).not.toEqual(initialRequests[0].query)

    flow.controls!.onReset()
    renderPage()
    expect(flow.state!.applied).toEqual({ fromDate: '2026-09-25', toDate: '2026-10-01', terminalId: 'terminal-a' })
    expect(flow.state!.terminalDraft).toBe('terminal-a')
    const resetRequests = await requests()
    expect(resetRequests[0].query).toEqual({ ...flow.state!.applied, granularity: 'AUTO' })
    expect(resetRequests[1].query).toEqual({ ...flow.state!.applied, page: '0', size: '10' })
    expect(flow.filterApply).toBeTypeOf('function')
    flow.drawerOpenChange!(true)
    flow.terminalChange!('terminal-b')
    renderPage()
    flow.filterApply!()
    renderPage()
    expect(flow.state!.applied.terminalId).toBe('terminal-b')
    expect(flow.state!.applied.fromDate).toBe('2026-09-25')
    dataQueries().forEach(({ queryKey }) => expect(queryKey[6]).toBe('terminal-b'))
    const terminalRequests = await requests()
    expect(terminalRequests[0].query).toEqual({ ...flow.state!.applied, granularity: 'AUTO' })
    expect(terminalRequests[1].query).toEqual({ ...flow.state!.applied, page: '0', size: '10' })
  })

  it.each([
    { fromDate: '', toDate: '2026-10-01' },
    { fromDate: '2026-10-01', toDate: '' },
    { fromDate: '2026-02-30', toDate: '2026-10-01' },
    { fromDate: 'invalid', toDate: '2026-10-01' },
    { fromDate: '2026-10-02', toDate: '2026-10-01' },
  ])('blocks invalid completion without changing either query and renders safely: %j', (range) => {
    renderPage()
    const keys = dataQueries().map(({ queryKey }) => queryKey)
    const applied = flow.state!.applied
    flow.controls!.onDraftChange(range)
    expect(() => renderPage()).not.toThrow()
    flow.controls!.onRangeComplete(range)
    expect(flow.state!.applied).toBe(applied)
    expect(flow.state!.validationMessage).toBe('Sana oralig‘ini to‘g‘ri kiriting.')
    const html = renderPage()
    expect(dataQueries().map(({ queryKey }) => queryKey)).toEqual(keys)
    expect(html).toContain('Sana oralig‘ini to‘g‘ri kiriting.')
  })

  it.each([
    [1, '2026-10-01'], [7, '2026-09-25'], [30, '2026-09-02'],
  ] as const)('immediately commits the %s-day Tashkent preset with the applied terminal', (days, fromDate) => {
    renderPage()
    flow.drawerOpenChange!(true)
    flow.terminalChange!('terminal-a')
    renderPage()
    flow.filterApply!()
    flow.drawerOpenChange!(true)
    flow.terminalChange!('terminal-b')
    renderPage()
    flow.controls!.onPreset(days)
    renderPage()
    const selected = flow.controls!.range
    expect(selected).toEqual({ fromDate, toDate: '2026-10-01' })
    expect(flow.state!.applied).toEqual({ ...selected, terminalId: 'terminal-a' })
    expect(flow.state!.terminalDraft).toBe('terminal-a')
    expect(flow.apply).toBeNull()
    expect((Date.parse(selected.toDate) - Date.parse(selected.fromDate)) / 86_400_000 + 1).toBe(days)
    expect(dataQueries().map(({ queryKey }) => queryKey.slice(4, 6))).toEqual([
      [selected.fromDate, selected.toDate], [selected.fromDate, selected.toDate],
    ])
    dataQueries().forEach(({ queryKey }) => expect(queryKey[6]).toBe('terminal-a'))
  })
})

vi.mock('./MetricCards', () => ({ MetricCards: (props: { metrics: DashboardView['metrics'] }) => { flow.cards = props.metrics; return null } }))
vi.mock('./StatusDonut', () => ({ StatusDonut: (props: { pie: DashboardView['pie'] }) => { flow.donut = props.pie; return null } }))
vi.mock('./TrendChart', () => ({ TrendChart: (props: { view: DashboardView; granularityControls: ReactNode }) => { flow.chart = props.view; return <section>{props.granularityControls}</section> } }))
vi.mock('./GranularityControl', () => ({ GranularityControl: (props: { onSelect: (value: ChartGroupBy) => void }) => { flow.selectGranularity = props.onSelect; return null } }))

describe('One Dashboard analytics owner', () => {
  it('shares one response across all three consumers and refreshes explicit granularity without changing dates', async () => {
    flow.view = { ...dashboardMetadata, metrics: { total: dashboardZero, success: dashboardZero, processing: dashboardZero, failed: dashboardZero, uncategorized: dashboardZero },
      pie: { success: dashboardZero, processing: dashboardZero, failed: dashboardZero, uncategorized: dashboardZero }, chartGroupBy: 'DAY', buckets: [] }
    renderPage()
    expect(flow.cards).toBe(flow.view.metrics)
    expect(flow.chart).toBe(flow.view)
    expect(flow.donut).toBe(flow.view.pie)
    expect(flow.queries.filter(({ queryKey }) => queryKey[3] === 'dashboard')).toHaveLength(1)
    const applied = flow.state!.applied
    flow.selectGranularity!('WEEK')
    renderPage()
    expect(flow.state!.applied).toBe(applied)
    expect((await requests())[0].query).toEqual({ ...applied, granularity: 'WEEK' })
    flow.refresh!()
    expect(flow.refreshed.filter((key) => key[3] === 'dashboard')).toEqual([readKeys.dashboard(scope, { ...applied, granularity: 'WEEK' })])
    expect(flow.state!.requestedGranularity).toBe('WEEK')
    flow.terminalChange!('T1')
    renderPage()
    flow.filterApply!()
    renderPage()
    expect((await requests())[0].query).toEqual({ ...applied, terminalId: 'T1', granularity: 'WEEK' })
    flow.controls!.onPreset(1)
    renderPage()
    expect(flow.state!.requestedGranularity).toBe('AUTO')
    expect((await requests())[0].query).toEqual({ fromDate: '2026-10-01', toDate: '2026-10-01', terminalId: 'T1', granularity: 'AUTO' })
  })
})
