import { createReadRuntime, type CurrentReadState } from '@/app/read/read-runtime'
import type { LiveReadApi, ReadApiRegistrations, ReadRegistration } from '@/app/read/createLiveReadApi'
import type { Capability } from '@/shared/auth/access'
import { can } from '@/shared/auth/access'
import { ActionBusinessRejectionError } from '@/shared/api/one-dispatch-action'
import type { TerminalRow, BankAccountRow, CashierRow, ManagementOption } from '@/shared/contracts/management-read'
import type { Page, ReadScope, TerminalOption } from '@/shared/contracts/merchant-read'
import type { CashierCreatePort } from '@/features/cashiers/create-cashier'
import type { AssignTerminalsPort } from '@/features/cashiers/assign-terminals'
import type { UnassignPort } from '@/features/cashiers/unassign-terminal'

// D5-MGMT-DEMO-ONLY. Synthetic normalized ports; no transport, token or global fetch replacement.
export const D5_FIXED_INSTANT = '2026-09-15T07:00:00Z'

const allGrants = [
  'GET_TERMINAL', 'GET_BANK_ACCOUNTS', 'GET_CASHIERS', 'CREATE_CASHIER',
  'ASSIGN_TERMINALS', 'UNASSIGN_TERMINAL', 'GET_DROPDOWN_MERCHANTS',
  'GET_DROPDOWN_BANK_ACCOUNTS', 'GET_DROPDOWN_TERMINALS',
] as const

export const day5ScenarioNames = [
  'NORMAL', 'TERMINAL_ONLY', 'BANK_ONLY', 'CASHIER_READ_ONLY', 'CREATE_ONLY',
  'ASSIGN_ONLY', 'UNASSIGN_ONLY', 'LOOKUP_DENIED', 'EMPTY', 'ERROR',
  'PARENT_CHANGED', 'LOOKUP_LOST', 'UNKNOWN_STATUS', 'NULL_OPTIONAL', 'BAD_REQUIRED',
  'DUPLICATE_PHONE', 'OWNERSHIP_REJECTED', 'DELAYED_DOUBLE_SUBMIT',
  'UNKNOWN_AFTER_DISPATCH', 'CONFIRMED_REFETCH_FAILED', 'SCOPE_CHANGED',
  'PERMISSION_REVOKED', 'ACTION_CONTRACT_BLOCKED',
] as const
export type Day5Scenario = (typeof day5ScenarioNames)[number]
export type Day5Operation = 'terminalList' | 'bankAccountList' | 'cashierList' |
  'merchantLookup' | 'bankAccountLookup' | 'terminalLookup' | 'create' | 'assign' | 'unassign'
export type Day5Counters = Readonly<Record<Day5Operation, number>>

const emptyCounters = (): Record<Day5Operation, number> => ({
  terminalList: 0, bankAccountList: 0, cashierList: 0,
  merchantLookup: 0, bankAccountLookup: 0, terminalLookup: 0,
  create: 0, assign: 0, unassign: 0,
})

export function scenarioPermissions(scenario: Day5Scenario): readonly string[] {
  switch (scenario) {
    case 'TERMINAL_ONLY': return ['GET_TERMINAL']
    case 'BANK_ONLY': return ['GET_BANK_ACCOUNTS']
    case 'CASHIER_READ_ONLY': return ['GET_CASHIERS']
    case 'CREATE_ONLY': return ['CREATE_CASHIER', 'GET_DROPDOWN_TERMINALS']
    case 'ASSIGN_ONLY': return ['GET_CASHIERS', 'ASSIGN_TERMINALS', 'GET_DROPDOWN_TERMINALS']
    case 'UNASSIGN_ONLY': return ['GET_CASHIERS', 'UNASSIGN_TERMINAL']
    case 'LOOKUP_DENIED': return allGrants.filter((grant) => !grant.startsWith('GET_DROPDOWN_'))
    default: return allGrants
  }
}

const configured = { kind: 'configured' } as const satisfies ReadRegistration
const unavailable = { kind: 'unavailable', reason: 'Not part of Day 05 DEV preview.' } as const satisfies ReadRegistration
const registrations: ReadApiRegistrations = {
  dashboard: unavailable, dynamicQr: unavailable,
  terminalLookup: configured, terminalList: configured, bankAccountList: configured,
  cashierList: configured, merchantLookup: configured, bankAccountLookup: configured,
  p5List: unavailable,
}

const merchants: readonly ManagementOption[] = [
  { id: '1', name: 'D5-MGMT-DEMO Merchant A' },
  { id: '2', name: 'D5-MGMT-DEMO Merchant B' },
]

function makeTerminal(index: number): TerminalRow {
  const merchantId = index <= 6 ? '1' : '2'
  const bankAccountId = String(200 + index)
  return { id: index.toString(16).padStart(32, '0'), pkey: index.toString(16).padStart(32, '0'), name: `D5-MGMT-DEMO Terminal ${index}`,
    statusCode: index === 12 ? 777 : 0, merchantId,
    merchantName: merchants[Number(merchantId) - 1].name, bankAccountId,
    bankAccountName: `D5-MGMT-DEMO Account ${index}`,
    terminalType: null, address: null, regionName: null, districtName: null,
    mccCode: null, regionId: null, districtId: null, staticQrId: null,
    staticQrLink: null, phones: [], createdAt: null, updatedAt: null }
}

function makeBank(index: number): BankAccountRow {
  const merchantId = index <= 6 ? '1' : '2'
  return { id: String(200 + index), name: `D5-MGMT-DEMO Account ${index}`,
    bankName: 'D5-MGMT-DEMO Bank', accountNumber: `000${String(index).padStart(17, '0')}`,
    tin: `0000000${String(index).padStart(2, '0')}`, mfo: '00001', contractNumber: `D5-${index}`,
    merchantId, merchantName: merchants[Number(merchantId) - 1].name,
    statusCode: index === 12 ? 777 : 0 }
}

interface DemoCashier { row: CashierRow; merchantId: string; historicalTerminalIds: readonly string[] }

function makeCashier(index: number, terminals: readonly TerminalRow[]): DemoCashier {
  const merchantId = index <= 6 ? '1' : '2'
  const owned = terminals.filter((terminal) => terminal.merchantId === merchantId)
  const members = index % 3 === 0 ? [] : index % 3 === 1 ? [owned[0]] : [owned[0], owned[1]]
  const active = members.map((terminal) => ({ id: terminal.id, name: terminal.name, statusCode: 0 }))
  return { row: { id: String(100 + index), fullname: `D5-MGMT-DEMO Cashier ${index}`,
    phone: `9989010000${String(index).padStart(2, '0')}`, roleDisplay: 'Synthetic display only',
    statusCode: index === 12 ? 777 : 0, terminals: active, createdAt: null, updatedAt: null }, merchantId,
    historicalTerminalIds: members.map((terminal) => terminal.id) }
}

function page<T>(rows: readonly T[], pageNumber: number, size: number): Page<T> {
  return { content: rows.slice(pageNumber * size, (pageNumber + 1) * size),
    totalElements: rows.length, totalPages: Math.ceil(rows.length / size), page: pageNumber, size }
}

function includes(value: string, search: string): boolean {
  return value.toLocaleLowerCase('en-US').includes(search.toLocaleLowerCase('en-US'))
}

export function createDay5Simulator(scenario: Day5Scenario, revision = 1) {
  let scope: ReadScope = { source: 'demo', sessionScopeId: `d5-demo-${revision}`, accessRevision: revision }
  let permissions = new Set<string>(scenarioPermissions(scenario))
  let counters = emptyCounters()
  let terminalRows = Array.from({ length: 12 }, (_, index) => makeTerminal(index + 1))
  let bankRows = Array.from({ length: 12 }, (_, index) => makeBank(index + 1))
  let cashiers = Array.from({ length: 12 }, (_, index) => makeCashier(index + 1, terminalRows))
  if (scenario === 'EMPTY') { terminalRows = []; bankRows = []; cashiers = [] }
  if (scenario === 'NULL_OPTIONAL') bankRows = bankRows.map((row) => ({ ...row, tin: null, mfo: null, contractNumber: null }))
  if (scenario === 'UNKNOWN_STATUS') {
    terminalRows = terminalRows.map((row) => ({ ...row, statusCode: 777 }))
    bankRows = bankRows.map((row) => ({ ...row, statusCode: 777 }))
    cashiers = cashiers.map((entry) => ({ ...entry, row: { ...entry.row, statusCode: 777 } }))
  }
  let lookupLost = false
  let failReadsAfterMutation = false
  let release!: () => void
  const delayed = new Promise<void>((resolve) => { release = resolve })
  let dispatched!: () => void
  const dispatchedPromise = new Promise<void>((resolve) => { dispatched = resolve })
  const listeners = new Set<() => void>()
  let snapshot = { scenario, scope, permissions: [...permissions], counters: { ...counters }, lookupLost }
  function emit() {
    snapshot = { scenario, scope, permissions: [...permissions], counters: { ...counters }, lookupLost }
    listeners.forEach((listener) => listener())
  }
  function count(operation: Day5Operation) { counters = { ...counters, [operation]: counters[operation] + 1 }; emit() }
  function beforeRead(operation: Day5Operation, signal: AbortSignal) {
    count(operation)
    if (signal.aborted) throw new DOMException('Synthetic read aborted.', 'AbortError')
    if (scenario === 'ERROR' || (failReadsAfterMutation && operation === 'cashierList')) throw new Error('Synthetic read failure.')
    if (scenario === 'BAD_REQUIRED') throw new Error('Synthetic required-field contract failure.')
    if (lookupLost && (operation === 'merchantLookup' || operation === 'bankAccountLookup' || operation === 'terminalLookup')) throw new Error('Synthetic lookup lost.')
  }
  const api: LiveReadApi = {
    registrations,
    dashboard: async () => { throw new Error('D5 preview has no dashboard port.') },
    dynamicQrs: async () => { throw new Error('D5 preview has no QR port.') },
    async terminals(signal) { beforeRead('terminalLookup', signal); return terminalRows.map((row) => ({ id: row.id, name: row.name })) },
    async terminalsForMerchant(merchantId, signal) { beforeRead('terminalLookup', signal); return terminalRows.filter((row) => !merchantId || row.merchantId === merchantId).map((row) => ({ id: row.id, name: row.name })) },
    async terminalList(filters, signal) { beforeRead('terminalList', signal); const search = filters.search.trim(); return page(terminalRows.filter((row) =>
      (!filters.merchantId || row.merchantId === filters.merchantId) && (!filters.bankAccountId || row.bankAccountId === filters.bankAccountId) &&
      (!search || includes(row.name, search) || includes(row.id, search))), filters.page, filters.size) },
    async bankAccountList(filters, signal) { beforeRead('bankAccountList', signal); const search = filters.search.trim(); return page(bankRows.filter((row) =>
      (!filters.merchantId || row.merchantId === filters.merchantId) && (!search || [row.name, row.bankName, row.accountNumber, row.tin ?? ''].some((value) => includes(value, search)))), filters.page, filters.size) },
    async cashierList(filters, signal) { beforeRead('cashierList', signal); const search = filters.search.trim(); return page(cashiers.filter((entry) =>
      (!filters.merchantId || entry.merchantId === filters.merchantId) && (!filters.terminalId || entry.historicalTerminalIds.includes(filters.terminalId)) &&
      (!search || includes(entry.row.fullname, search) || includes(entry.row.phone, search))).map((entry) => entry.row), filters.page, filters.size) },
    async merchantLookup(signal) { beforeRead('merchantLookup', signal); return merchants },
    async bankAccountLookup(merchantId, signal) { beforeRead('bankAccountLookup', signal); return bankRows.filter((row) => !merchantId || row.merchantId === merchantId).map((row) => ({ id: row.id, name: row.name })) },
    p5List: async () => { throw new Error('D6 P5 is not part of Day 05 DEV preview.') },
  }

  async function beforeMutation(operation: 'create' | 'assign' | 'unassign') {
    count(operation)
    dispatched()
    if (scenario === 'DELAYED_DOUBLE_SUBMIT' || scenario === 'SCOPE_CHANGED' || scenario === 'PERMISSION_REVOKED') await delayed
    if (scenario === 'OWNERSHIP_REJECTED') throw new ActionBusinessRejectionError('Synthetic ownership rejection; deployed classifier unproven.')
  }
  function afterMutation() {
    if (scenario === 'CONFIRMED_REFETCH_FAILED') failReadsAfterMutation = true
    if (scenario === 'UNKNOWN_AFTER_DISPATCH') throw new Error('Synthetic response lost after dispatch.')
    return { success: true, data: null }
  }

  const ports: { create: CashierCreatePort; assign: AssignTerminalsPort; unassign: UnassignPort } = {
    create: { async create(request) {
      await beforeMutation('create')
      if (scenario === 'DUPLICATE_PHONE' && cashiers.some((entry) => entry.row.phone === request.phone)) {
        throw new ActionBusinessRejectionError('Synthetic duplicate phone rejection; deployed classifier unproven.')
      }
      const next = String(200 + cashiers.length + 1)
      const members = request.terminalIds.map((id) => terminalRows.find((row) => row.id === id)).filter((row): row is TerminalRow => row !== undefined)
      cashiers = [{ row: { id: next, fullname: request.fullname, phone: request.phone,
        statusCode: 0, roleDisplay: 'Synthetic display only', terminals: members.map((row) => ({ id: row.id, name: row.name, statusCode: 0 })), createdAt: null, updatedAt: null },
        merchantId: members[0]?.merchantId ?? '1', historicalTerminalIds: request.terminalIds }, ...cashiers]
      emit()
      return afterMutation()
    } },
    assign: { async assign(request) {
      await beforeMutation('assign')
      cashiers = cashiers.map((entry) => entry.row.id === String(request.cashierId) ? {
        ...entry, historicalTerminalIds: [...new Set([...entry.historicalTerminalIds, ...request.terminalIds])],
        row: { ...entry.row, terminals: [...entry.row.terminals, ...request.terminalIds.filter((id) => !entry.row.terminals.some((item) => item.id === id)).map((id) => {
          const row = terminalRows.find((item) => item.id === id)
          return { id, name: row?.name ?? id, statusCode: 0 }
        })] },
      } : entry)
      emit()
      return afterMutation()
    } },
    unassign: { async unassign(query) {
      await beforeMutation('unassign')
      cashiers = cashiers.map((entry) => entry.row.id === query.cashierId ? {
        ...entry, row: { ...entry.row, terminals: entry.row.terminals.filter((terminal) => terminal.id !== query.terminalId) },
      } : entry)
      emit()
      return afterMutation()
    } },
  }
  const currentState = (): CurrentReadState => ({ scope, access: { kind: 'authenticated', permissions } })
  return {
    api, ports, currentState, getCurrentScope: () => scope,
    getSnapshot: () => snapshot, subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    has(capability: Capability) { return can(currentState().access, capability, false) },
    terminalOptions(): readonly TerminalOption[] { return terminalRows.map((row) => ({ id: row.id, name: row.name })) },
    resetCounters() { counters = emptyCounters(); emit() },
    replaceSession() { scope = { ...scope, sessionScopeId: `${scope.sessionScopeId}-replaced`, accessRevision: scope.accessRevision + 1 }; emit() },
    revokePermission(authority: string) { permissions = new Set([...permissions].filter((item) => item !== authority)); scope = { ...scope, accessRevision: scope.accessRevision + 1 }; emit() },
    loseLookup() { lookupLost = true; emit() },
    releaseMutation() { release() }, whenMutationDispatched: () => dispatchedPromise,
    actionAvailable: scenario !== 'ACTION_CONTRACT_BLOCKED',
  }
}

export type Day5Simulator = ReturnType<typeof createDay5Simulator>

// The real read runtime is constructed by the DEV page from these same normalized ports.
export function createDay5ReadRuntime(simulator: Day5Simulator) {
  return createReadRuntime(simulator.api, simulator.currentState)
}
