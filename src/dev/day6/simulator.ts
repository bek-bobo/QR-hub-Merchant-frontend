import { createReadRuntime, type CurrentReadState } from '@/app/read/read-runtime'
import type {
  LiveReadApi,
  ReadApiRegistrations,
  ReadRegistration,
} from '@/app/read/createLiveReadApi'
import type { P5ResetPort } from '@/features/p5/p5-reset'
import { ActionBusinessRejectionError } from '@/shared/api/one-dispatch-action'
import { safeContractError } from '@/shared/api/errors'
import { can, type Capability } from '@/shared/auth/access'
import type { ManagementOption } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'
import type { P5Filters } from '@/shared/contracts/p5-filters'
import type { P5Row } from '@/shared/contracts/p5-read'

// D6-P5-DEMO-ONLY. Synthetic normalized ports; no transport, token, storage or global fetch replacement.
export const D6_FIXED_INSTANT = '2026-09-23T09:30:00'

export const day6ScenarioNames = [
  'NORMAL',
  'READ_ONLY',
  'RESET_ONLY',
  'NO_P5_GRANTS',
  'LOOKUP_DENIED',
  'PARENT_CHANGED',
  'LOOKUP_LOST',
  'EMPTY',
  'ERROR',
  'DELAYED_READ',
  'UNKNOWN_STATUS',
  'NULL_OPTIONAL',
  'BAD_REQUIRED',
  'INELIGIBLE_DEVICE',
  'TARGET_CHANGED',
  'CONFIRMED',
  'REJECTED_SYNTHETIC',
  'DELAYED_DOUBLE_SUBMIT',
  'UNKNOWN_AFTER_DISPATCH',
  'MALFORMED_SUCCESS',
  'CONFIRMED_REFETCH_FAILED',
  'SCOPE_CHANGED',
  'PERMISSION_REVOKED',
  'ACTION_CONTRACT_BLOCKED',
] as const

export type Day6Scenario = (typeof day6ScenarioNames)[number]
export type Day6Operation =
  | 'p5List'
  | 'merchantLookup'
  | 'terminalLookup'
  | 'resetPin'
export type Day6Counters = Readonly<Record<Day6Operation, number>>

const allAuthorities = [
  'GET_P5',
  'RESET_P5_PIN',
  'GET_DROPDOWN_MERCHANTS',
  'GET_DROPDOWN_TERMINALS',
] as const

export function scenarioPermissions(scenario: Day6Scenario): readonly string[] {
  switch (scenario) {
    case 'READ_ONLY':
      return ['GET_P5']
    case 'RESET_ONLY':
      return ['RESET_P5_PIN']
    case 'NO_P5_GRANTS':
      return ['GET_DASHBOARD', 'GET_CASHIERS']
    case 'LOOKUP_DENIED':
      return ['GET_P5', 'RESET_P5_PIN']
    default:
      return allAuthorities
  }
}

const configured = { kind: 'configured' } as const satisfies ReadRegistration
const unavailable = {
  kind: 'unavailable',
  reason: 'Not part of the Day 06 DEV preview.',
} as const satisfies ReadRegistration

const registrations: ReadApiRegistrations = {
  dashboard: unavailable,
  dynamicQr: unavailable,
  terminalLookup: configured,
  terminalList: unavailable,
  bankAccountList: unavailable,
  cashierList: unavailable,
  merchantLookup: configured,
  bankAccountLookup: unavailable,
  regionLookup: unavailable,
  districtLookup: unavailable,
  p5List: configured,
}

const merchants: readonly ManagementOption[] = [
  { id: '101', name: 'D6-P5-DEMO Merchant North' },
  { id: '202', name: 'D6-P5-DEMO Merchant South with a deliberately long display name' },
]

interface DemoTerminal {
  readonly id: string
  readonly merchantId: string
  readonly name: string
}

const terminals: readonly DemoTerminal[] = [
  { id: 'D6-P5-DEMO-TERM-A', merchantId: '101', name: 'D6-P5-DEMO Terminal A' },
  { id: 'D6-P5-DEMO-TERM-B', merchantId: '101', name: 'D6-P5-DEMO Terminal B with long text for wrapping' },
  { id: 'D6-P5-DEMO-TERM-C', merchantId: '202', name: 'D6-P5-DEMO Terminal C' },
  { id: 'D6-P5-DEMO-TERM-D', merchantId: '202', name: 'D6-P5-DEMO Terminal D' },
]

function makeRow(index: number): P5Row {
  const merchantIndex = index <= 6 ? 0 : 1
  const merchantId = merchants[merchantIndex].id
  const owned = terminals.filter((terminal) => terminal.merchantId === merchantId)
  const terminal = owned[(index - 1) % owned.length]
  const deviceStatus = index === 2 ? 1 : index === 3 ? 777 : 0
  return Object.freeze({
    deviceId: `D6-P5-DEMO-${String(index).padStart(9, '0')}`,
    description:
      index % 4 === 0
        ? null
        : index === 1
          ? 'D6-P5-DEMO long description that verifies wrapping without changing the underlying value'
          : `D6-P5-DEMO device ${index}`,
    deviceStatus,
    terminalId: terminal.id,
    terminalName: terminal.name,
    terminalType: 'P5',
    merchantName: merchants[merchantIndex].name,
    staticQrId: index % 3 === 0 ? null : `D6-P5-DEMO-QR-${index}`,
    staticQrLink: index % 3 === 0 ? null : `https://example.invalid/d6-p5-demo/${index}`,
    staticQrStatus: index % 3 === 0 ? null : index % 2,
    createdAt: `2026-09-${String(24 - index).padStart(2, '0')}T${String(8 + (index % 8)).padStart(2, '0')}:15:00`,
  })
}

function emptyCounters(): Record<Day6Operation, number> {
  return { p5List: 0, merchantLookup: 0, terminalLookup: 0, resetPin: 0 }
}

function page<T>(rows: readonly T[], pageNumber: number, size: number): Page<T> {
  return {
    content: rows.slice(pageNumber * size, (pageNumber + 1) * size),
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / size),
    page: pageNumber,
    size,
  }
}

function includes(value: string, search: string): boolean {
  return value.toLocaleLowerCase('en-US').includes(search.toLocaleLowerCase('en-US'))
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export function createDay6Simulator(scenario: Day6Scenario, revision = 1) {
  let scope: ReadScope = {
    source: 'demo',
    sessionScopeId: `d6-p5-demo-${revision}`,
    accessRevision: revision,
  }
  let permissions = new Set<string>(scenarioPermissions(scenario))
  let counters = emptyCounters()
  let rows = Array.from({ length: 12 }, (_, index) => makeRow(index + 1))
  if (scenario === 'EMPTY') rows = []
  if (scenario === 'UNKNOWN_STATUS') {
    rows = rows.map((row) => ({ ...row, deviceStatus: 777 }))
  }
  if (scenario === 'NULL_OPTIONAL') {
    rows = rows.map((row) => ({
      ...row,
      description: null,
      staticQrId: null,
      staticQrLink: null,
      staticQrStatus: null,
    }))
  }
  if (scenario === 'INELIGIBLE_DEVICE') {
    rows = rows.map((row) => ({ ...row, deviceStatus: 1 }))
  }

  let lookupLost = false
  let parentChanged = false
  let failP5Refetch = false
  const readGate = deferred()
  const mutationGate = deferred()
  const dispatchedGate = deferred()
  const listeners = new Set<() => void>()
  let snapshot = {
    scenario,
    scope,
    permissions: [...permissions],
    counters: { ...counters },
    lookupLost,
    parentChanged,
  }

  function emit() {
    snapshot = {
      scenario,
      scope,
      permissions: [...permissions],
      counters: { ...counters },
      lookupLost,
      parentChanged,
    }
    listeners.forEach((listener) => listener())
  }

  function count(operation: Day6Operation) {
    counters = { ...counters, [operation]: counters[operation] + 1 }
    emit()
  }

  function assertSignal(signal: AbortSignal) {
    if (signal.aborted) throw new DOMException('Synthetic read aborted.', 'AbortError')
  }

  const api: LiveReadApi = {
    registrations,
    dashboard: async () => { throw new Error('Day 06 preview has no dashboard port.') },
    dynamicQrs: async () => { throw new Error('Day 06 preview has no dynamic QR port.') },
    dynamicQrStats: async () => { throw new Error('Day 06 preview has no dynamic QR stats port.') },
    async terminals(signal) {
      count('terminalLookup')
      assertSignal(signal)
      if (lookupLost) throw new Error('Synthetic terminal lookup lost.')
      return terminals.map(({ id, name }) => ({ id, name }))
    },
    async terminalsForMerchant(merchantId, signal) {
      count('terminalLookup')
      assertSignal(signal)
      if (lookupLost) throw new Error('Synthetic terminal lookup lost.')
      return terminals
        .filter((terminal) => !merchantId || terminal.merchantId === merchantId)
        .map(({ id, name }) => ({ id, name }))
    },
    terminalList: async () => { throw new Error('Day 06 preview has no terminal list port.') },
    bankAccountList: async () => { throw new Error('Day 06 preview has no bank-account port.') },
    cashierList: async () => { throw new Error('Day 06 preview has no cashier port.') },
    async merchantLookup(signal) {
      count('merchantLookup')
      assertSignal(signal)
      if (lookupLost) throw new Error('Synthetic merchant lookup lost.')
      return parentChanged ? merchants.slice(1) : merchants
    },
    bankAccountLookup: async () => { throw new Error('Day 06 preview has no bank-account lookup port.') },
    regionLookup: async () => { throw new Error('Day 06 preview has no region lookup port.') },
    districtLookup: async () => { throw new Error('Day 06 preview has no district lookup port.') },
    async p5List(filters: P5Filters, signal: AbortSignal) {
      count('p5List')
      assertSignal(signal)
      if (scenario === 'DELAYED_READ') {
        await readGate.promise
        assertSignal(signal)
      }
      if (scenario === 'BAD_REQUIRED') throw safeContractError()
      if (scenario === 'ERROR' || failP5Refetch) throw new Error('Synthetic P5 read failure.')
      const search = filters.search.trim()
      const filtered = rows.filter((row) =>
        (!filters.merchantId || row.merchantName === merchants.find((item) => item.id === filters.merchantId)?.name) &&
        (!filters.terminalId || row.terminalId === filters.terminalId) &&
        (filters.status === undefined || row.deviceStatus === filters.status) &&
        (!search || includes(row.deviceId, search) || includes(row.terminalName, search)),
      )
      return page(filtered, filters.page, filters.size)
    },
  }

  const resetPort: P5ResetPort = {
    async reset(request, requestScope) {
      count('resetPin')
      dispatchedGate.resolve()
      if (scenario === 'DELAYED_DOUBLE_SUBMIT' || scenario === 'SCOPE_CHANGED' || scenario === 'PERMISSION_REVOKED') {
        await mutationGate.promise
      }
      if (
        requestScope.source !== scope.source ||
        requestScope.sessionScopeId !== scope.sessionScopeId ||
        requestScope.accessRevision !== scope.accessRevision
      ) {
        throw new Error('Synthetic reset completed outside its original scope.')
      }
      if (!rows.some((row) => row.deviceId === request.deviceId)) {
        throw new Error('Synthetic reset target is no longer visible.')
      }
      if (scenario === 'REJECTED_SYNTHETIC') {
        throw new ActionBusinessRejectionError('Synthetic rejection; not a deployed classifier.')
      }
      if (scenario === 'UNKNOWN_AFTER_DISPATCH') throw new Error('Synthetic response lost after dispatch.')
      if (scenario === 'MALFORMED_SUCCESS') return { success: true }
      if (scenario === 'CONFIRMED_REFETCH_FAILED') failP5Refetch = true
      emit()
      return { success: true, data: null }
    },
  }

  const currentState = (): CurrentReadState => ({
    scope,
    access: { kind: 'authenticated', permissions },
  })

  return {
    api,
    resetPort,
    currentState,
    getCurrentScope: () => scope,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    has(capability: Capability) {
      return can(currentState().access, capability, false)
    },
    visibleRows: () => rows,
    resetCounters() {
      counters = emptyCounters()
      emit()
    },
    releaseRead() {
      readGate.resolve()
    },
    releaseMutation() {
      mutationGate.resolve()
    },
    whenMutationDispatched: () => dispatchedGate.promise,
    replaceSession() {
      scope = {
        ...scope,
        sessionScopeId: `${scope.sessionScopeId}-replaced`,
        accessRevision: scope.accessRevision + 1,
      }
      emit()
    },
    revokeResetPermission() {
      permissions = new Set([...permissions].filter((item) => item !== 'RESET_P5_PIN'))
      scope = { ...scope, accessRevision: scope.accessRevision + 1 }
      emit()
    },
    loseLookup() {
      lookupLost = true
      emit()
    },
    changeParent() {
      parentChanged = true
      emit()
    },
    changeTarget() {
      rows = rows.map((row) => row.deviceStatus === 0 ? { ...row, deviceStatus: 1 } : row)
      emit()
    },
    resetRegistration: scenario === 'ACTION_CONTRACT_BLOCKED'
      ? ({ kind: 'unavailable', reason: 'Synthetic reset contract gate is closed.' } as const)
      : configured,
    actionAvailable: scenario !== 'ACTION_CONTRACT_BLOCKED',
  }
}

export type Day6Simulator = ReturnType<typeof createDay6Simulator>

export function createDay6ReadRuntime(simulator: Day6Simulator) {
  return createReadRuntime(simulator.api, simulator.currentState)
}
