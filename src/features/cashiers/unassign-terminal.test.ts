import { describe, expect, it } from 'vitest'
import { can } from '@/shared/auth/access'
import { endpoints } from '@/shared/contracts/endpoints'
import type { CashierRow, CashierTerminal } from '@/shared/contracts/management-read'
import type { Page, ReadScope } from '@/shared/contracts/merchant-read'
import { buildUnassignQuery, createUnassignTerminalController, decodeUnassignSuccess, resolveCurrentUnassignTarget } from './unassign-terminal'

const scope: ReadScope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const terminal: CashierTerminal = { id: 'terminal-active', name: 'Active', statusCode: 0 }
const cashier: CashierRow = { createdAt: null, updatedAt: null, id: '41', fullname: 'Cashier A', phone: '998901234567', roleDisplay: 'User', statusCode: 777, terminals: [terminal] }
const data: Page<CashierRow> = { content: [cashier], totalElements: 1, totalPages: 1, page: 0, size: 10 }
const target = { cashier, terminal }
const success = { success: true, data: null }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => { resolve = yes })
  return { promise, resolve }
}

describe('single terminal unassign contract', () => {
  it('uses exact DELETE endpoint and query-only string parameters', () => {
    expect(endpoints.unassignCashierTerminal).toEqual({ service: 'web', method: 'DELETE', path: '/cashiers/unassign/terminal', auth: 'bearer', body: 'none' })
    expect(buildUnassignQuery(target)).toEqual({ cashierId: '41', terminalId: 'terminal-active' })
    expect(Object.keys(buildUnassignQuery(target) ?? {})).toEqual(['cashierId', 'terminalId'])
    expect(buildUnassignQuery({ cashier: { ...cashier, id: '9007199254740993' }, terminal })).toBeNull()
    expect(buildUnassignQuery({ cashier, terminal: { ...terminal, id: '' } })).toBeNull()
  })

  it('accepts only the documented explicit-null void envelope, not a changed-row claim', () => {
    expect(decodeUnassignSuccess(success)).toBeUndefined()
    expect(() => decodeUnassignSuccess({ success: true })).toThrow()
    expect(() => decodeUnassignSuccess({ success: true, data: { changed: 1 } })).toThrow()
  })

  it('requires exact unassign permission independent of read, assign, create, role and status', () => {
    const unassignOnly = { kind: 'authenticated' as const, permissions: new Set(['UNASSIGN_TERMINAL']) }
    expect(can(unassignOnly, 'cashier.unassignTerminal', false)).toBe(true)
    expect(can(unassignOnly, 'cashier.assignTerminals', false)).toBe(false)
    expect(can({ kind: 'authenticated', permissions: new Set(['GET_CASHIERS', 'ASSIGN_TERMINALS', 'CREATE_CASHIER', 'ROLE_MERCHANT_USER']) }, 'cashier.unassignTerminal', false)).toBe(false)
  })

  it('requires current result identity and an actual active nested membership', () => {
    const input = { target, resultData: data, currentData: data, dataUpdatedAt: 100, currentUpdatedAt: 100,
      invalidated: false, scope, currentScope: scope, canRead: true, canUnassign: true }
    expect(resolveCurrentUnassignTarget(input)).toBe(target)
    expect(resolveCurrentUnassignTarget({ ...input, currentData: { ...data } })).toBeNull()
    expect(resolveCurrentUnassignTarget({ ...input, currentUpdatedAt: 101 })).toBeNull()
    expect(resolveCurrentUnassignTarget({ ...input, currentScope: { ...scope, accessRevision: 2 } })).toBeNull()
    expect(resolveCurrentUnassignTarget({ ...input, canUnassign: false })).toBeNull()
    expect(resolveCurrentUnassignTarget({ ...input, target: { cashier, terminal: { ...terminal } } })).toBeNull()
    expect(resolveCurrentUnassignTarget({ ...input, target: { cashier: { ...cashier }, terminal } })).toBeNull()
  })
})

describe('single terminal unassign action', () => {
  it('requires explicit confirmation and blocks stale targets before DELETE', async () => {
    let currentTarget: typeof target | null = target
    let sends = 0
    const port = { unassign: async () => { sends++; return success } }
    const controller = createUnassignTerminalController({ currentScope: () => scope, currentTarget: () => currentTarget,
      canUnassign: () => true, port: () => port, invalidateConfirmed: async () => undefined })
    expect((await controller.submit()).kind).toBe('not-sent')
    expect(controller.armConfirmation()).toBe(true)
    currentTarget = null
    expect((await controller.submit()).kind).toBe('not-sent')
    expect(sends).toBe(0)
  })

  it('binds confirmation to the exact selected cashier and terminal', async () => {
    const secondTerminal: CashierTerminal = { id: 'terminal-other', name: 'Other', statusCode: 0 }
    const secondCashier = { ...cashier, terminals: [secondTerminal] }
    const secondTarget = { cashier: secondCashier, terminal: secondTerminal }
    let currentTarget: typeof target | typeof secondTarget | null = target
    let sends = 0
    const port = { unassign: async () => { sends++; return success } }
    const controller = createUnassignTerminalController({ currentScope: () => scope, currentTarget: () => currentTarget,
      canUnassign: () => true, port: () => port, invalidateConfirmed: async () => undefined })
    expect(controller.armConfirmation()).toBe(true)
    currentTarget = secondTarget
    expect((await controller.submit()).kind).toBe('not-sent')
    expect(sends).toBe(0)
  })

  it('blocks permission loss after confirmation before dispatch', async () => {
    let allowed = true
    let sends = 0
    const port = { unassign: async () => { sends++; return success } }
    const controller = createUnassignTerminalController({ currentScope: () => scope, currentTarget: () => target,
      canUnassign: () => allowed, port: () => port, invalidateConfirmed: async () => undefined })
    controller.armConfirmation()
    allowed = false
    expect((await controller.submit()).kind).toBe('not-sent')
    expect(sends).toBe(0)
  })

  it('dispatches one query-only DELETE and confirms without a changed-row assertion', async () => {
    const flight = deferred<unknown>()
    let sends = 0
    let received: unknown
    let invalidations = 0
    const port = { unassign: (query: unknown) => { sends++; received = query; return flight.promise } }
    const controller = createUnassignTerminalController({ currentScope: () => scope, currentTarget: () => target,
      canUnassign: () => true, port: () => port, invalidateConfirmed: async () => { invalidations++ } })
    expect(controller.armConfirmation()).toBe(true)
    const first = controller.submit()
    const second = controller.submit()
    flight.resolve(success)
    expect((await first).kind).toBe('confirmed')
    expect((await second).kind).toBe('not-sent')
    expect(received).toEqual({ cashierId: '41', terminalId: 'terminal-active' })
    expect(sends).toBe(1)
    expect(invalidations).toBe(1)
  })

  it('leaves active membership intact and latches ambiguous dispatched outcomes', async () => {
    let sends = 0
    const port = { unassign: async () => { sends++; throw new Error('timeout or 401') } }
    const controller = createUnassignTerminalController({ currentScope: () => scope, currentTarget: () => target,
      canUnassign: () => true, port: () => port, invalidateConfirmed: async () => undefined })
    controller.armConfirmation()
    expect((await controller.submit()).kind).toBe('unknown')
    expect((await controller.submit()).kind).toBe('not-sent')
    expect(sends).toBe(1)
    expect(cashier.terminals).toEqual([terminal])
  })

  it('keeps malformed success UNKNOWN and refetch failure separate from CONFIRMED', async () => {
    const malformedPort = { unassign: async () => ({ success: true }) }
    const unknown = createUnassignTerminalController({ currentScope: () => scope, currentTarget: () => target,
      canUnassign: () => true, port: () => malformedPort, invalidateConfirmed: async () => undefined })
    unknown.armConfirmation()
    expect((await unknown.submit()).kind).toBe('unknown')
    const confirmedPort = { unassign: async () => success }
    const confirmed = createUnassignTerminalController({ currentScope: () => scope, currentTarget: () => target,
      canUnassign: () => true, port: () => confirmedPort, invalidateConfirmed: async () => { throw new Error('refetch failed') } })
    confirmed.armConfirmation()
    expect((await confirmed.submit()).kind).toBe('confirmed')
    expect(confirmed.getState().outcome.kind).toBe('confirmed')
  })

  it('suppresses late old-scope completion after DELETE has dispatched', async () => {
    let currentScope = scope
    const flight = deferred<unknown>()
    const started = deferred<void>()
    const port = { unassign: () => { started.resolve(); return flight.promise } }
    const controller = createUnassignTerminalController({ currentScope: () => currentScope, currentTarget: () => target,
      canUnassign: () => true, port: () => port, invalidateConfirmed: async () => undefined })
    controller.armConfirmation()
    const pending = controller.submit()
    await started.promise
    currentScope = { ...scope, accessRevision: 2 }
    flight.resolve(success)
    expect((await pending).kind).toBe('stale')
  })
})
