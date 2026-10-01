import { describe, expect, it } from 'vitest'
import { can } from '@/shared/auth/access'
import { ActionBusinessRejectionError } from '@/shared/api/one-dispatch-action'
import { endpoints } from '@/shared/contracts/endpoints'
import type { CashierRow } from '@/shared/contracts/management-read'
import type { ReadScope, TerminalOption } from '@/shared/contracts/merchant-read'
import { buildAssignTerminalsRequest, createAssignTerminalsController, decodeAssignTerminalsSuccess, resolveCurrentAssignTarget } from './assign-terminals'

const scope: ReadScope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const cashier: CashierRow = { createdAt: null, updatedAt: null, id: '41', fullname: 'Cashier', phone: '998901234567', roleDisplay: 'User', statusCode: 777,
  terminals: [{ id: 'active', name: 'Already active', statusCode: 0 }] }
const options: readonly TerminalOption[] = [{ id: 'active', name: 'Already active' }, { id: 'new', name: 'New or inactive' }]
const success = { success: true, data: null }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => { resolve = yes })
  return { promise, resolve }
}

describe('assign terminals contract', () => {
  it('targets the exact authenticated bulk-assign endpoint', () => {
    expect(endpoints.assignCashierTerminals).toEqual({ service: 'web', method: 'POST', path: '/cashiers/assign/terminals', auth: 'bearer', body: 'json' })
  })
  it('uses exact numeric cashier ID and only new lookup-backed string terminal IDs', () => {
    expect(buildAssignTerminalsRequest(cashier, ['new', 'new'], options)).toEqual({ cashierId: 41, terminalIds: ['new'] })
    expect(buildAssignTerminalsRequest(cashier, ['active'], options)).toBeNull()
    expect(buildAssignTerminalsRequest(cashier, ['active', 'new'], options)).toBeNull()
    expect(buildAssignTerminalsRequest(cashier, ['missing'], options)).toBeNull()
    expect(buildAssignTerminalsRequest(cashier, ['new'], null)).toBeNull()
    expect(buildAssignTerminalsRequest({ ...cashier, id: '9007199254740993' }, ['new'], options)).toBeNull()
  })

  it('confirms only the source-supported explicit-null void envelope', () => {
    expect(() => decodeAssignTerminalsSuccess(success)).not.toThrow()
    expect(() => decodeAssignTerminalsSuccess({ success: true })).toThrow()
    expect(() => decodeAssignTerminalsSuccess({ success: true, data: [] })).toThrow()
  })

  it('requires exact assign permission, not cashier read/create, terminal read or role', () => {
    const assignOnly = { kind: 'authenticated' as const, permissions: new Set(['ASSIGN_TERMINALS', 'GET_DROPDOWN_TERMINALS']) }
    expect(can(assignOnly, 'cashier.assignTerminals', false)).toBe(true)
    expect(can(assignOnly, 'terminal.read', false)).toBe(false)
    expect(can({ kind: 'authenticated', permissions: new Set(['GET_CASHIERS', 'CREATE_CASHIER', 'ROLE_MERCHANT_USER']) }, 'cashier.assignTerminals', false)).toBe(false)
  })

  it('binds the action target to the exact visible result and access identity', () => {
    const data = { content: [cashier], totalElements: 1, totalPages: 1, page: 0, size: 10 }
    const input = { target: cashier, resultData: data, currentData: data, dataUpdatedAt: 100, currentUpdatedAt: 100,
      invalidated: false, scope, currentScope: scope, canRead: true, canAssign: true }
    expect(resolveCurrentAssignTarget(input)).toBe(cashier)
    expect(resolveCurrentAssignTarget({ ...input, currentData: { ...data } })).toBeNull()
    expect(resolveCurrentAssignTarget({ ...input, currentUpdatedAt: 101 })).toBeNull()
    expect(resolveCurrentAssignTarget({ ...input, currentScope: { ...scope, accessRevision: 2 } })).toBeNull()
    expect(resolveCurrentAssignTarget({ ...input, invalidated: true })).toBeNull()
    expect(resolveCurrentAssignTarget({ ...input, canAssign: false })).toBeNull()
  })
})

describe('assign terminals action', () => {
  it('blocks stale target, denied permission and missing lookup before POST', async () => {
    let currentTarget: CashierRow | null = cashier
    let currentOptions: readonly TerminalOption[] | null = options
    let allowed = true
    let sends = 0
    const port = { assign: async () => { sends++; return success } }
    const controller = createAssignTerminalsController({ currentScope: () => scope, currentTarget: () => currentTarget,
      currentOptions: () => currentOptions, canAssign: () => allowed, port: () => port, invalidateConfirmed: async () => undefined })
    currentTarget = null
    expect((await controller.submit(['new'])).kind).toBe('not-sent')
    currentTarget = cashier
    currentOptions = null
    expect((await controller.submit(['new'])).kind).toBe('not-sent')
    currentOptions = options
    allowed = false
    expect((await controller.submit(['new'])).kind).toBe('not-sent')
    expect(sends).toBe(0)
  })

  it('sends one additive bulk body despite rapid duplicate submit and invalidates on confirmed only', async () => {
    const flight = deferred<unknown>()
    let sends = 0
    let body: unknown
    let invalidations = 0
    const port = { assign: (request: unknown) => { sends++; body = request; return flight.promise } }
    const controller = createAssignTerminalsController({ currentScope: () => scope, currentTarget: () => cashier,
      currentOptions: () => options, canAssign: () => true, port: () => port,
      invalidateConfirmed: async () => { invalidations++ } })
    const first = controller.submit(['new', 'new'])
    const second = controller.submit(['new'])
    flight.resolve(success)
    expect((await first).kind).toBe('confirmed')
    expect((await second).kind).toBe('not-sent')
    expect(body).toEqual({ cashierId: 41, terminalIds: ['new'] })
    expect(Object.keys(body as object)).toEqual(['cashierId', 'terminalIds'])
    expect(sends).toBe(1)
    expect(invalidations).toBe(1)
  })

  it('treats dispatched ambiguity as unknown with no replay or optimistic membership change', async () => {
    let sends = 0
    const port = { assign: async () => { sends++; throw new Error('timeout or 401') } }
    const controller = createAssignTerminalsController({ currentScope: () => scope, currentTarget: () => cashier,
      currentOptions: () => options, canAssign: () => true, port: () => port,
      invalidateConfirmed: async () => { throw new Error('unexpected invalidation') } })
    expect((await controller.submit(['new'])).kind).toBe('unknown')
    expect((await controller.submit(['new'])).kind).toBe('not-sent')
    expect(sends).toBe(1)
    expect(cashier.terminals).toEqual([{ id: 'active', name: 'Already active', statusCode: 0 }])
  })

  it('keeps malformed success unknown and does not downgrade confirmed after refetch failure', async () => {
    let ambiguousSends = 0
    const malformedPort = { assign: async () => { ambiguousSends++; return { success: true } } }
    const unknown = createAssignTerminalsController({ currentScope: () => scope, currentTarget: () => cashier,
      currentOptions: () => options, canAssign: () => true, port: () => malformedPort,
      invalidateConfirmed: async () => { throw new Error('must not run') } })
    expect((await unknown.submit(['new'])).kind).toBe('unknown')
    expect(ambiguousSends).toBe(1)
    const confirmedPort = { assign: async () => success }
    const confirmed = createAssignTerminalsController({ currentScope: () => scope, currentTarget: () => cashier,
      currentOptions: () => options, canAssign: () => true, port: () => confirmedPort,
      invalidateConfirmed: async () => { throw new Error('read refetch failed') } })
    expect((await confirmed.submit(['new'])).kind).toBe('confirmed')
    expect(confirmed.getState().outcome.kind).toBe('confirmed')
  })

  it('reserves rejected for an explicitly trusted classifier, never generic backend text', async () => {
    const trustedPort = { assign: async () => { throw new ActionBusinessRejectionError('Tanlov rad etildi.') } }
    const trusted = createAssignTerminalsController({ currentScope: () => scope, currentTarget: () => cashier,
      currentOptions: () => options, canAssign: () => true, port: () => trustedPort,
      invalidateConfirmed: async () => undefined })
    expect(await trusted.submit(['new'])).toMatchObject({ kind: 'rejected', reason: 'Tanlov rad etildi.' })
    const genericPort = { assign: async () => { throw new Error('TERMINAL_NOT_OWNED') } }
    const generic = createAssignTerminalsController({ currentScope: () => scope, currentTarget: () => cashier,
      currentOptions: () => options, canAssign: () => true, port: () => genericPort,
      invalidateConfirmed: async () => undefined })
    expect((await generic.submit(['new'])).kind).toBe('unknown')
  })

  it('does not dispatch when selected terminal becomes active during preparation', async () => {
    let target: CashierRow = cashier
    let sends = 0
    const port = { assign: async () => { sends++; return success } }
    const controller = createAssignTerminalsController({ currentScope: () => scope, currentTarget: () => target,
      currentOptions: () => options, canAssign: () => true, port: () => port, invalidateConfirmed: async () => undefined })
    const pending = controller.submit(['new'])
    target = { ...cashier, terminals: [...cashier.terminals, { id: 'new', name: 'Now active', statusCode: 0 }] }
    expect((await pending).kind).toBe('not-sent')
    expect(sends).toBe(0)
  })

  it('does not dispatch when the selected lookup option disappears before dispatch', async () => {
    let currentOptions: readonly TerminalOption[] | null = options
    let sends = 0
    const port = { assign: async () => { sends++; return success } }
    const controller = createAssignTerminalsController({ currentScope: () => scope, currentTarget: () => cashier,
      currentOptions: () => currentOptions, canAssign: () => true, port: () => port,
      invalidateConfirmed: async () => undefined })
    const pending = controller.submit(['new'])
    currentOptions = options.slice(0, 1)
    expect((await pending).kind).toBe('not-sent')
    expect(sends).toBe(0)
  })

  it('does not dispatch when assign permission is revoked during preparation', async () => {
    let allowed = true
    let sends = 0
    const port = { assign: async () => { sends++; return success } }
    const controller = createAssignTerminalsController({ currentScope: () => scope, currentTarget: () => cashier,
      currentOptions: () => options, canAssign: () => allowed, port: () => port,
      invalidateConfirmed: async () => undefined })
    const pending = controller.submit(['new'])
    allowed = false
    expect((await pending).kind).toBe('not-sent')
    expect(sends).toBe(0)
  })

  it('suppresses late old-scope and replaced-row results', async () => {
    let currentScope = scope
    let currentTarget: CashierRow | null = cashier
    const flight = deferred<unknown>()
    const dispatched = deferred<void>()
    const port = { assign: () => { dispatched.resolve(); return flight.promise } }
    const controller = createAssignTerminalsController({ currentScope: () => currentScope, currentTarget: () => currentTarget,
      currentOptions: () => options, canAssign: () => true, port: () => port, invalidateConfirmed: async () => undefined })
    const pending = controller.submit(['new'])
    await dispatched.promise
    currentScope = { ...scope, accessRevision: 2 }
    currentTarget = { ...cashier }
    flight.resolve(success)
    expect((await pending).kind).toBe('stale')
  })
})
