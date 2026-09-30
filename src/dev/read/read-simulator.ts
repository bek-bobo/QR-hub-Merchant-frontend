import type {
  LiveReadApi,
  ReadApiRegistrations,
  ReadRegistration,
} from '@/app/read/createLiveReadApi'
import type { AccessContextValue } from '@/shared/auth/access'
import type { Profile } from '@/shared/auth/model'
import type {
  CountAmount,
  DashboardBucket,
  DashboardFilters,
  DashboardView,
  DynamicQrFilters,
  DynamicQrRow,
  Metric,
  Money,
  Outcome,
  Page,
  ReadScope,
} from '@/shared/contracts/merchant-read'
import { d3DynamicQrRows, d3TerminalOptions } from './read.fixture'

export const readScenarioDefinitions = {
  RECONCILED: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'reconciled',
  },
  AMOUNT_MISMATCH: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'amount-mismatch',
  },
  NORMAL: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'normal',
  },
  EMPTY: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'empty',
  },
  DELAYED: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'delayed',
  },
  ERROR: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'error',
  },
  DASHBOARD_ONLY: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'configured', dynamicQr: 'unavailable', terminalLookup: 'configured' },
    behavior: 'normal',
  },
  LIST_ONLY: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'unavailable', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'normal',
  },
  LOOKUP_DENIED: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS'],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'normal',
  },
  ALL_DENIED: {
    permissions: [],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'normal',
  },
  UNKNOWN_STATUS: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'normal',
  },
  NULLABLE_GROWTH: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'nullable-growth',
  },
  ZERO_CHART: {
    permissions: ['GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_DROPDOWN_TERMINALS'],
    readiness: { dashboard: 'configured', dynamicQr: 'configured', terminalLookup: 'configured' },
    behavior: 'zero-chart',
  },
} as const

export type ReadPreviewScenario = keyof typeof readScenarioDefinitions
type ScenarioBehavior =
  (typeof readScenarioDefinitions)[ReadPreviewScenario]['behavior']
type ReadinessName = 'configured' | 'unavailable'

export interface ReadRequestCounters {
  readonly dashboard: number
  readonly dynamicQr: number
  readonly terminalLookup: number
}

export interface ReadSimulatorSnapshot {
  readonly scenario: ReadPreviewScenario
  readonly counters: ReadRequestCounters
}

export interface ReadSimulator {
  readonly api: LiveReadApi
  readonly access: AccessContextValue
  readonly scope: ReadScope
  readonly profile: Profile
  readonly permissions: readonly string[]
  readonly registrations: ReadApiRegistrations
  getSnapshot(): ReadSimulatorSnapshot
  subscribe(listener: () => void): () => void
  resetCounters(): void
}

function registration(kind: ReadinessName, feature: string): ReadRegistration {
  return kind === 'configured'
    ? { kind: 'configured' }
    : { kind: 'unavailable', reason: `${feature} DEV scenario configuration is unavailable.` }
}

const unavailableD5Registration = {
  kind: 'unavailable',
  reason: 'D5 management is not part of D3 preview.',
} as const satisfies ReadRegistration

function money(minorUnits: bigint | number | string): Money {
  return Object.freeze({
    minorUnits: String(minorUnits),
    currency: 'UZS',
    scale: 2,
  })
}

function sumAmount(rows: readonly DynamicQrRow[]): Money {
  return money(
    rows.reduce((total, row) => total + BigInt(row.amount.minorUnits), 0n),
  )
}

function isOutcome(row: DynamicQrRow, outcome: Exclude<Outcome, 'total'>) {
  if (outcome === 'success') {
    return row.statusCode === 50
  }
  if (outcome === 'processing') {
    return row.statusCode === 0 || row.statusCode === 10
  }
  return row.statusCode === 5 || row.statusCode === 20
}

function outcomeRows(
  rows: readonly DynamicQrRow[],
  outcome: Outcome,
): readonly DynamicQrRow[] {
  return outcome === 'total'
    ? rows
    : rows.filter((row) => isOutcome(row, outcome))
}

function countAmount(
  rows: readonly DynamicQrRow[],
  outcome: Outcome,
): CountAmount {
  const selected = outcomeRows(rows, outcome)
  return Object.freeze({ count: selected.length, amount: sumAmount(selected) })
}

function metric(
  rows: readonly DynamicQrRow[],
  outcome: Outcome,
  behavior: ScenarioBehavior,
): Metric {
  const growth = {
    total: [12.5, 9.25],
    success: [8, 6.5],
    processing: [-4.5, -2.25],
    failed: [3, 1.75],
  } as const
  const [countGrowthPct, amountGrowthPct] = growth[outcome]
  return Object.freeze({
    ...countAmount(rows, outcome),
    countGrowthPct:
      behavior === 'nullable-growth' && outcome === 'total'
        ? null
        : countGrowthPct,
    amountGrowthPct:
      behavior === 'nullable-growth' && outcome === 'success'
        ? null
        : amountGrowthPct,
  })
}

function zeroCountAmount(): CountAmount {
  return Object.freeze({ count: 0, amount: money(0) })
}

function zeroMetric(): Metric {
  return Object.freeze({
    ...zeroCountAmount(),
    countGrowthPct: 0,
    amountGrowthPct: 0,
  })
}

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 10_000) / 100
}

function dashboardBucket(
  date: string,
  rows: readonly DynamicQrRow[],
): DashboardBucket {
  return Object.freeze({
    label: date,
    periodStart: date,
    periodEnd: date,
    values: Object.freeze({
      total: countAmount(rows, 'total'),
      success: countAmount(rows, 'success'),
      processing: countAmount(rows, 'processing'),
      failed: countAmount(rows, 'failed'),
    }),
  })
}

function zeroDashboard(filters: DashboardFilters): DashboardView {
  const zero = zeroCountAmount()
  return Object.freeze({
    metrics: Object.freeze({
      total: zeroMetric(),
      success: zeroMetric(),
      processing: zeroMetric(),
      failed: zeroMetric(),
    }),
    pie: Object.freeze({
      success: Object.freeze({ ...zero, percent: 0 }),
      processing: Object.freeze({ ...zero, percent: 0 }),
      failed: Object.freeze({ ...zero, percent: 0 }),
    }),
    chartGroupBy: 'DAY',
    buckets: Object.freeze([dashboardBucket(filters.fromDate, [])]),
  })
}

function emptyDashboard(): DashboardView {
  const zero = zeroCountAmount()
  return Object.freeze({
    metrics: Object.freeze({
      total: zeroMetric(),
      success: zeroMetric(),
      processing: zeroMetric(),
      failed: zeroMetric(),
    }),
    pie: Object.freeze({
      success: Object.freeze({ ...zero, percent: 0 }),
      processing: Object.freeze({ ...zero, percent: 0 }),
      failed: Object.freeze({ ...zero, percent: 0 }),
    }),
    chartGroupBy: 'DAY',
    buckets: Object.freeze([]),
  })
}

function matchingRows(filters: DashboardFilters) {
  return d3DynamicQrRows.filter((row) => {
    const date = row.createdAt.slice(0, 10)
    return (
      date >= filters.fromDate &&
      date <= filters.toDate &&
      (!filters.terminalId || row.terminalId === filters.terminalId)
    )
  })
}

function buildDashboard(
  filters: DashboardFilters,
  behavior: ScenarioBehavior,
): DashboardView {
  if (behavior === 'empty') {
    return emptyDashboard()
  }
  if (behavior === 'zero-chart') {
    return zeroDashboard(filters)
  }

  const sourceRows = matchingRows(filters)
  const rows = behavior === 'reconciled' || behavior === 'amount-mismatch'
    ? sourceRows.filter((row) => [0, 5, 10, 20, 50].includes(row.statusCode))
    : sourceRows
  const dates = [...new Set(rows.map((row) => row.createdAt.slice(0, 10)))]
    .sort()
  const totals = {
    success: countAmount(rows, 'success'),
    processing: countAmount(rows, 'processing'),
    failed: countAmount(rows, 'failed'),
  }
  const successPercent = percentage(totals.success.count, rows.length)
  const failedPercent = percentage(totals.failed.count, rows.length)
  const processingPercent =
    rows.length === 0
      ? 0
      : Math.round((100 - successPercent - failedPercent) * 100) / 100

  return Object.freeze({
    metrics: Object.freeze({
      total: behavior === 'amount-mismatch'
        ? Object.freeze({ ...metric(rows, 'total', behavior),
            amount: money(BigInt(sumAmount(rows).minorUnits) + 1n) })
        : metric(rows, 'total', behavior),
      success: metric(rows, 'success', behavior),
      processing: metric(rows, 'processing', behavior),
      failed: metric(rows, 'failed', behavior),
    }),
    pie: Object.freeze({
      success: Object.freeze({
        ...totals.success,
        percent: successPercent,
      }),
      processing: Object.freeze({
        ...totals.processing,
        percent: processingPercent,
      }),
      failed: Object.freeze({
        ...totals.failed,
        percent: failedPercent,
      }),
    }),
    chartGroupBy: 'DAY',
    buckets: Object.freeze(
      dates.map((date) =>
        dashboardBucket(
          date,
          rows.filter((row) => row.createdAt.startsWith(date)),
        ),
      ),
    ),
  })
}

function publicRow(row: (typeof d3DynamicQrRows)[number]): DynamicQrRow {
  return Object.freeze({
    pkey: row.pkey,
    link: row.link,
    createdAt: row.createdAt,
    terminalName: row.terminalName,
    merchantName: row.merchantName,
    amount: row.amount,
    statusCode: row.statusCode,
    rrn: row.rrn,
  })
}

function buildDynamicQrPage(
  filters: DynamicQrFilters,
  behavior: ScenarioBehavior,
): Page<DynamicQrRow> {
  const filtered = behavior === 'empty'
    ? []
    : d3DynamicQrRows
        .filter((row) => {
          const date = row.createdAt.slice(0, 10)
          const search = filters.search.trim().toLocaleLowerCase('uz-UZ')
          return (
            date >= filters.fromDate &&
            date <= filters.toDate &&
            (!filters.terminalId || row.terminalId === filters.terminalId) &&
            (filters.status === undefined || row.statusCode === filters.status) &&
            (!search || row.terminalName.toLocaleLowerCase('uz-UZ').includes(search))
          )
        })
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const totalElements = filtered.length
  const totalPages = Math.ceil(totalElements / filters.size)
  const offset = filters.page * filters.size

  return Object.freeze({
    content: Object.freeze(
      filtered.slice(offset, offset + filters.size).map(publicRow),
    ),
    totalElements,
    totalPages,
    page: filters.page,
    size: filters.size,
  })
}

function waitForDelay(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('The request was aborted.', 'AbortError'))
      return
    }

    const timer = globalThis.setTimeout(finish, 900)
    signal.addEventListener('abort', abort, { once: true })

    function finish() {
      signal.removeEventListener('abort', abort)
      resolve()
    }

    function abort() {
      globalThis.clearTimeout(timer)
      reject(new DOMException('The request was aborted.', 'AbortError'))
    }
  })
}

export function createReadSimulator(
  scenario: ReadPreviewScenario,
  scopeRevision = 1,
): ReadSimulator {
  const definition = readScenarioDefinitions[scenario]
  const registrations: ReadApiRegistrations = Object.freeze({
    dashboard: registration(definition.readiness.dashboard, 'Dashboard'),
    dynamicQr: registration(definition.readiness.dynamicQr, 'Dynamic QR'),
    terminalLookup: registration(
      definition.readiness.terminalLookup,
      'Terminal lookup',
    ),
    terminalList: unavailableD5Registration,
    bankAccountList: unavailableD5Registration,
    cashierList: unavailableD5Registration,
    merchantLookup: unavailableD5Registration,
    bankAccountLookup: unavailableD5Registration,
    p5List: unavailableD5Registration,
  })
  const permissions = Object.freeze([...definition.permissions])
  const profile: Profile = Object.freeze({
    userId: 'd3-read-demo-user',
    phone: '998900000003',
    fullname: 'D3 Read Preview Merchant',
    roles: Object.freeze([]),
    permissions,
  })
  const access: AccessContextValue = Object.freeze({
    kind: 'authenticated',
    permissions: new Set(profile.permissions),
  })
  const scope: ReadScope = Object.freeze({
    source: 'demo',
    sessionScopeId: `d3-read-${scenario.toLocaleLowerCase('en-US')}-${scopeRevision}`,
    accessRevision: scopeRevision,
  })
  const listeners = new Set<() => void>()
  let counters = { dashboard: 0, dynamicQr: 0, terminalLookup: 0 }
  let snapshot: ReadSimulatorSnapshot = Object.freeze({
    scenario,
    counters: Object.freeze({ ...counters }),
  })

  function emit() {
    snapshot = Object.freeze({
      scenario,
      counters: Object.freeze({ ...counters }),
    })
    for (const listener of listeners) {
      listener()
    }
  }

  async function beforeRead(
    feature: keyof ReadRequestCounters,
    signal: AbortSignal,
  ) {
    counters = { ...counters, [feature]: counters[feature] + 1 }
    emit()
    if (definition.behavior === 'error') {
      throw new Error('Controlled D3 read simulator error.')
    }
    if (definition.behavior === 'delayed') {
      await waitForDelay(signal)
    } else if (signal.aborted) {
      throw new DOMException('The request was aborted.', 'AbortError')
    }
  }

  const api: LiveReadApi = {
    registrations,
    async dashboard(filters, signal) {
      await beforeRead('dashboard', signal)
      return buildDashboard(filters, definition.behavior)
    },
    async dynamicQrs(filters, signal) {
      await beforeRead('dynamicQr', signal)
      return buildDynamicQrPage(filters, definition.behavior)
    },
    async terminals(signal) {
      await beforeRead('terminalLookup', signal)
      return d3TerminalOptions
    },
    terminalsForMerchant: async () => { throw new Error('D5 management is not part of D3 preview.') },
    terminalList: async () => { throw new Error('D5 management is not part of D3 preview.') },
    bankAccountList: async () => { throw new Error('D5 management is not part of D3 preview.') },
    cashierList: async () => { throw new Error('D5 management is not part of D3 preview.') },
    merchantLookup: async () => { throw new Error('D5 management is not part of D3 preview.') },
    bankAccountLookup: async () => { throw new Error('D5 management is not part of D3 preview.') },
    p5List: async () => { throw new Error('D6 P5 is not part of D3 preview.') },
  }

  return {
    api,
    access,
    scope,
    profile,
    permissions,
    registrations,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    resetCounters() {
      counters = { dashboard: 0, dynamicQr: 0, terminalLookup: 0 }
      emit()
    },
  }
}
