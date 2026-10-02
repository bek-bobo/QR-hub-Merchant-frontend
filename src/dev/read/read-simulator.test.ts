import { describe, expect, it } from 'vitest'
import { createReadRuntime } from '@/app/read/read-runtime'
import { reconcileDashboard } from '@/features/dashboard/presenters'
import { getTashkentDatePreset } from '@/shared/filters/date-range'
import {
  D3_READ_FIXED_INSTANT,
  d3DynamicQrRows,
  d3TerminalOptions,
} from './read.fixture'
import {
  createReadSimulator,
  readScenarioDefinitions,
} from './read-simulator'

const defaultFilters = {
  fromDate: '2026-09-09',
  toDate: '2026-09-15',
  search: '',
  page: 0,
  size: 10,
} as const

function runtimeFor(scenario: keyof typeof readScenarioDefinitions) {
  const simulator = createReadSimulator(scenario)
  const runtime = createReadRuntime(simulator.api, () => ({
    scope: simulator.scope,
    access: simulator.access,
  }))
  return { runtime, simulator }
}

describe('D3 read simulator fixtures', () => {
  it('uses the fixed Tashkent business date and seven-day range', () => {
    expect(D3_READ_FIXED_INSTANT.toISOString()).toBe('2026-09-15T07:00:00.000Z')
    expect(getTashkentDatePreset(7, D3_READ_FIXED_INSTANT)).toEqual({
      fromDate: '2026-09-09',
      toDate: '2026-09-15',
    })
  })

  it('contains exactly 23 unique prefixed rows and two stable terminals', () => {
    expect(d3DynamicQrRows).toHaveLength(23)
    expect(new Set(d3DynamicQrRows.map((row) => row.pkey)).size).toBe(23)
    expect(d3DynamicQrRows.every((row) => row.pkey.startsWith('D3-QR-DEMO-')))
      .toBe(true)
    expect(d3TerminalOptions).toEqual([
      { id: 'T-01', name: 'Asosiy terminal' },
      { id: 'T-02', name: 'Chilonzor terminal' },
    ])
  })

  it('contains all verified statuses plus a neutral unknown status', () => {
    const statuses = new Set(d3DynamicQrRows.map((row) => row.statusCode))
    expect([...statuses].sort((left, right) => left - right)).toEqual([
      0, 5, 10, 20, 25, 50, 777,
    ])
  })
})

describe('D3 dynamic QR simulation', () => {
  it('returns date/terminal stats independent of list filters and pagination', async () => {
    const simulator = createReadSimulator('NORMAL')
    const signal = new AbortController().signal
    const filters = { ...defaultFilters, terminalId: 'T-01', fromDate: '2026-09-15', search: 'missing', status: 5 as const, page: 99 }
    const stats = await simulator.api.dynamicQrStats(filters, signal)
    expect(stats).toEqual({
      totalAmount: { minorUnits: '15900000', currency: 'UZS', scale: 2 },
      totalServiceFeeAmount: { minorUnits: '238500', currency: 'UZS', scale: 2 },
    })
    const empty = await createReadSimulator('EMPTY').api.dynamicQrStats(defaultFilters, signal)
    expect(empty.totalAmount.minorUnits).toBe('0')
    expect(empty.totalServiceFeeAmount.minorUnits).toBe('0')
  })

  it('preserves stats simulator errors and aborts', async () => {
    await expect(createReadSimulator('ERROR').api.dynamicQrStats(defaultFilters, new AbortController().signal)).rejects.toThrow('Controlled D3')
    const controller = new AbortController()
    controller.abort()
    await expect(createReadSimulator('NORMAL').api.dynamicQrStats(defaultFilters, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    const delayed = new AbortController()
    const pending = createReadSimulator('DELAYED').api.dynamicQrStats(defaultFilters, delayed.signal)
    delayed.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('paginates size ten as 10, 10, and 3 with correct totals', async () => {
    const simulator = createReadSimulator('NORMAL')
    const signal = new AbortController().signal
    const first = await simulator.api.dynamicQrs(defaultFilters, signal)
    const second = await simulator.api.dynamicQrs(
      { ...defaultFilters, page: 1 },
      signal,
    )
    const third = await simulator.api.dynamicQrs(
      { ...defaultFilters, page: 2 },
      signal,
    )

    expect([first.content.length, second.content.length, third.content.length])
      .toEqual([10, 10, 3])
    expect(first).toMatchObject({ totalElements: 23, totalPages: 3, page: 0, size: 10 })
  })

  it('preserves status zero and inclusive date filtering', async () => {
    const simulator = createReadSimulator('NORMAL')
    const page = await simulator.api.dynamicQrs(
      {
        ...defaultFilters,
        fromDate: '2026-09-09',
        toDate: '2026-09-09',
        status: 0,
      },
      new AbortController().signal,
    )

    expect(page.content.length).toBeGreaterThan(0)
    expect(page.content.every((row) => row.statusCode === 0)).toBe(true)
    expect(page.content.every((row) => row.createdAt.startsWith('2026-09-09T')))
      .toBe(true)
  })

  it('filters by terminal and case-insensitive terminal-name search', async () => {
    const simulator = createReadSimulator('NORMAL')
    const page = await simulator.api.dynamicQrs(
      {
        ...defaultFilters,
        terminalId: 'T-02',
        search: 'CHILONZOR',
        size: 25,
      },
      new AbortController().signal,
    )

    expect(page.totalElements).toBeGreaterThan(0)
    expect(page.totalPages).toBe(1)
    expect(page.content.every((row) => row.terminalName === 'Chilonzor terminal'))
      .toBe(true)
  })

  it('returns rows in deterministic newest-first order', async () => {
    const simulator = createReadSimulator('NORMAL')
    const page = await simulator.api.dynamicQrs(
      { ...defaultFilters, size: 25 },
      new AbortController().signal,
    )

    expect(page.content[0]?.createdAt).toBe('2026-09-15T18:45:00')
    expect(page.content.at(-1)?.createdAt).toBe('2026-09-09T08:05:00')
    expect(
      page.content.every(
        (row, index) =>
          index === 0 || page.content[index - 1]!.createdAt >= row.createdAt,
      ),
    ).toBe(true)
  })
})

describe('D3 read scenario gates', () => {
  it('exposes reconciled, uncategorized and amount-only mismatch dashboard fixtures', async () => {
    const signal = new AbortController().signal
    const normal = await createReadSimulator('NORMAL').api.dashboard(defaultFilters, signal)
    const reconciled = await createReadSimulator('RECONCILED').api.dashboard(defaultFilters, signal)
    const amount = await createReadSimulator('AMOUNT_MISMATCH').api.dashboard(defaultFilters, signal)
    expect(reconcileDashboard(normal)).toEqual({ countMatches: false, amountMatches: false })
    expect(reconcileDashboard(reconciled)).toEqual({ countMatches: true, amountMatches: true })
    expect(reconcileDashboard(amount)).toEqual({ countMatches: true, amountMatches: false })
  })
  it('defines the exact capability and readiness matrices', () => {
    const full = ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS']
    const allConfigured = {
      dashboard: 'configured',
      dynamicQr: 'configured',
      terminalLookup: 'configured',
    }
    expect(
      Object.fromEntries(
        Object.entries(readScenarioDefinitions).map(([name, definition]) => [
          name,
          { permissions: definition.permissions, readiness: definition.readiness },
        ]),
      ),
    ).toEqual({
      RECONCILED: { permissions: full, readiness: allConfigured },
      AMOUNT_MISMATCH: { permissions: full, readiness: allConfigured },
      NORMAL: { permissions: full, readiness: allConfigured },
      EMPTY: { permissions: full, readiness: allConfigured },
      DELAYED: { permissions: full, readiness: allConfigured },
      ERROR: { permissions: full, readiness: allConfigured },
      DASHBOARD_ONLY: {
        permissions: full,
        readiness: { ...allConfigured, dynamicQr: 'unavailable' },
      },
      LIST_ONLY: {
        permissions: full,
        readiness: { ...allConfigured, dashboard: 'unavailable' },
      },
      LOOKUP_DENIED: {
        permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS'],
        readiness: allConfigured,
      },
      ALL_DENIED: { permissions: [], readiness: allConfigured },
      UNKNOWN_STATUS: { permissions: full, readiness: allConfigured },
      NULLABLE_GROWTH: { permissions: full, readiness: allConfigured },
      ZERO_CHART: { permissions: full, readiness: allConfigured },
    })
  })

  it('derives dashboard totals from the full date and terminal selection', async () => {
    const simulator = createReadSimulator('NORMAL')
    const signal = new AbortController().signal
    const all = await simulator.api.dashboard(defaultFilters, signal)
    const terminal = await simulator.api.dashboard(
      { ...defaultFilters, terminalId: 'T-01' },
      signal,
    )

    expect(all.metrics.total.count).toBe(23)
    expect(terminal.metrics.total.count).toBe(12)
    expect(terminal.buckets.every((bucket) => bucket.values.total.count > 0))
      .toBe(true)
  })

  it('keeps denied lookup and all-denied requests disabled at runtime', () => {
    const lookup = runtimeFor('LOOKUP_DENIED')
    expect(lookup.runtime.terminalOptions().enabled).toBe(false)
    expect(lookup.runtime.dashboardOptions(defaultFilters).enabled).toBe(true)
    expect(lookup.simulator.getSnapshot().counters).toEqual({
      dashboard: 0,
      dynamicQr: 0,
      terminalLookup: 0,
    })

    const denied = runtimeFor('ALL_DENIED')
    expect(denied.runtime.dashboardOptions(defaultFilters).enabled).toBe(false)
    expect(denied.runtime.dynamicQrOptions(defaultFilters).enabled).toBe(false)
    expect(denied.runtime.terminalOptions().enabled).toBe(false)
    expect(denied.simulator.getSnapshot().counters).toEqual({
      dashboard: 0,
      dynamicQr: 0,
      terminalLookup: 0,
    })
  })

  it('provides nullable growth and genuine zero-chart scenarios', async () => {
    const nullable = createReadSimulator('NULLABLE_GROWTH')
    const nullableView = await nullable.api.dashboard(
      defaultFilters,
      new AbortController().signal,
    )
    expect(nullableView.metrics.total.countGrowthPct).toBeNull()
    expect(nullableView.metrics.success.amountGrowthPct).toBeNull()

    const zero = createReadSimulator('ZERO_CHART')
    const zeroView = await zero.api.dashboard(
      defaultFilters,
      new AbortController().signal,
    )
    expect(zeroView.metrics.total.count).toBe(0)
    expect(zeroView.buckets[0]?.values.total.amount.minorUnits).toBe('0')
  })

  it('counts each read operation independently and resets counters', async () => {
    const simulator = createReadSimulator('NORMAL')
    const signal = new AbortController().signal
    await simulator.api.dashboard(defaultFilters, signal)
    await simulator.api.dynamicQrs(defaultFilters, signal)
    await simulator.api.terminals(signal)
    expect(simulator.getSnapshot().counters).toEqual({
      dashboard: 1,
      dynamicQr: 1,
      terminalLookup: 1,
    })

    simulator.resetCounters()
    expect(simulator.getSnapshot().counters).toEqual({
      dashboard: 0,
      dynamicQr: 0,
      terminalLookup: 0,
    })
  })

  it('rejects an already-aborted delayed request without waiting', async () => {
    const simulator = createReadSimulator('DELAYED')
    const controller = new AbortController()
    controller.abort()

    await expect(simulator.api.dashboard(defaultFilters, controller.signal))
      .rejects.toMatchObject({ name: 'AbortError' })
  })
})
