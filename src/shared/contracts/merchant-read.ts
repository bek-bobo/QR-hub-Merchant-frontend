import { safeContractError } from '@/shared/api/errors'

export type ReadSource = 'live' | 'demo'
export type ReadFeature = 'dashboard' | 'dynamicQr' | 'terminalLookup'
export type QrStatusFilter = 0 | 5 | 10 | 20 | 50
export type QrStatusKind =
  | 'new'
  | 'expired'
  | 'processing'
  | 'cancelled'
  | 'rejected'
  | 'success'
  | 'unknown'
export type PageSize = 10 | 20 | 25 | 50
export type Outcome = 'total' | 'success' | 'processing' | 'failed'
export type ChartGroupBy = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

export type Money = Readonly<{
  minorUnits: string
  currency: 'UZS'
  scale: 2
}>

export type CountAmount = Readonly<{ count: number; amount: Money }>

export type Metric = CountAmount &
  Readonly<{
    countGrowthPct: number | null
    amountGrowthPct: number | null
  }>

export type DateRange = Readonly<{ fromDate: string; toDate: string }>

export type DashboardFilters = DateRange &
  Readonly<{ terminalId?: string }>

export type DynamicQrFilters = DashboardFilters &
  Readonly<{
    status?: QrStatusFilter
    search: string
    page: number
    size: PageSize
  }>

export type TerminalOption = Readonly<{ id: string; name: string }>

export type DynamicQrRow = Readonly<{
  pkey: string
  link: string | null
  terminalType: string | null
  terminalId: string | null
  createdAt: string
  updatedAt: string | null
  terminalName: string
  merchantId: string | null
  merchantName: string
  bankAccountId: string | null
  bankAccountName: string | null
  amount: Money
  currencyAmount: number | null
  currencyCode: string | null
  rate: number | null
  serviceFeeAmount: number | null
  statusCode: number
  distributionStatus: number | null
  rrn: string | null
}>

export type Page<T> = Readonly<{
  content: readonly T[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}>

export type DashboardBucket = Readonly<{
  label: string
  periodStart: string
  periodEnd: string
  values: Readonly<Record<Outcome, CountAmount>>
}>

export type DashboardView = Readonly<{
  metrics: Readonly<Record<Outcome, Metric>>
  pie: Readonly<
    Record<
      Exclude<Outcome, 'total'>,
      CountAmount & Readonly<{ percent: number }>
    >
  >
  chartGroupBy: ChartGroupBy
  buckets: readonly DashboardBucket[]
}>

export type ReadScope = Readonly<{
  source: ReadSource
  sessionScopeId: string
  accessRevision: number
}>

export type ContractObject = Record<string, unknown>

export function contractObject(value: unknown): ContractObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw safeContractError()
  }

  return value as ContractObject
}

export function successEnvelopeData(payload: unknown): unknown {
  const envelope = contractObject(payload)
  if (envelope.success !== true || !Object.hasOwn(envelope, 'data')) {
    throw safeContractError()
  }

  return envelope.data
}

export function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw safeContractError()
  }

  return value
}

export function nullableString(value: unknown): string | null {
  if (value === null) {
    return null
  }

  return requiredString(value)
}

export function safeInteger(value: unknown, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw safeContractError()
  }

  return value as number
}

export function finiteNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw safeContractError()
  }

  return value
}

export function nullableFiniteNumber(value: unknown): number | null {
  return value === null ? null : finiteNumber(value)
}

export function uzsTiyin(value: unknown): Money {
  return Object.freeze({
    minorUnits: String(safeInteger(value)),
    currency: 'UZS',
    scale: 2,
  })
}

export function isoCalendarDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw safeContractError()
  }

  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw safeContractError()
  }

  return value
}

export function isoLocalDateTime(value: unknown): string {
  if (typeof value !== 'string') {
    throw safeContractError()
  }

  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?$/.exec(
    value,
  )
  if (!match) {
    throw safeContractError()
  }

  isoCalendarDate(match[1])
  const hour = Number(match[2])
  const minute = Number(match[3])
  const second = match[4] === undefined ? 0 : Number(match[4])
  if (hour > 23 || minute > 59 || second > 59) {
    throw safeContractError()
  }

  return value
}
