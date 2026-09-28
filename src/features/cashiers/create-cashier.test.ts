import { describe, expect, it } from 'vitest'
import { can } from '@/shared/auth/access'
import { ActionBusinessRejectionError, ActionNotDispatchedError } from '@/shared/api/one-dispatch-action'
import { QueryClient } from '@tanstack/react-query'
import { readKeys } from '@/shared/api/read-keys'
import type { ReadScope, TerminalOption } from '@/shared/contracts/merchant-read'
import { buildCashierCreateRequest, createCashierCreateController, decodeCashierCreateSuccess, invalidateCurrentCashierLists, normalizeCashierPhone } from './create-cashier'

const options: readonly TerminalOption[] = [{ id: 'terminal-01', name: 'Terminal A' }, { id: 'terminal-02', name: 'Terminal B' }]
const draft = { fullname: '  Oʻtkir Qodirov  ', phone: ' +998901234567 ', terminalIds: ['terminal-01', 'terminal-01', 'terminal-02'] }
const success = { success: true, data: null }
const scope: ReadScope = { source: 'live', sessionScopeId: 'session-1', accessRevision: 1 }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => { resolve = yes })
  return { promise, resolve }
}

describe('cashier create contract', () => {
  it('normalizes only outer whitespace and one leading plus', () => {
    expect(normalizeCashierPhone(' +998901234567 ')).toBe('998901234567')
    expect(normalizeCashierPhone('998901234567')).toBe('998901234567')
    for (const value of ['++998901234567', '998 901234567', '998-901234567', '901234567', '+997901234567', '99890123456a']) {
      expect(normalizeCashierPhone(value)).toBeNull()
    }
  })

  it('builds only the three Java request fields and deduplicates current string IDs', () => {
    const request = buildCashierCreateRequest(draft, options)
    expect(request).toEqual({ fullname: 'Oʻtkir Qodirov', phone: '998901234567', terminalIds: ['terminal-01', 'terminal-02'] })
    expect(Object.keys(request ?? {})).toEqual(['fullname', 'phone', 'terminalIds'])
    expect(buildCashierCreateRequest({ ...draft, fullname: '   ' }, options)).toBeNull()
    expect(buildCashierCreateRequest({ ...draft, terminalIds: [] }, options)).toBeNull()
    expect(buildCashierCreateRequest(draft, null)).toBeNull()
    expect(buildCashierCreateRequest(draft, options.slice(1))).toBeNull()
    expect(buildCashierCreateRequest({ ...draft, terminalIds: ['terminal-03'] }, options)).toBeNull()
  })

  it('confirms only the documented explicit-null void envelope', () => {
    expect(() => decodeCashierCreateSuccess(success)).not.toThrow()
    for (const body of [{ success: true }, { success: true, data: {} }, { success: false, data: null }, { success: true, data: null, error: { code: 'x' } }, null, 'ok']) {
      expect(() => decodeCashierCreateSuccess(body)).toThrow()
    }
  })

  it('does not infer create or read permission from one another, terminal read, merchant lookup or role', () => {
    const createOnly = { kind: 'authenticated' as const, permissions: new Set(['CREATE_CASHIER', 'GET_DROPDOWN_TERMINALS']) }
    expect(can(createOnly, 'cashier.create', false)).toBe(true)
    expect(can(createOnly, 'cashier.read', false)).toBe(false)
    expect(can(createOnly, 'terminal.read', false)).toBe(false)
    expect(can(createOnly, 'merchant.lookup', false)).toBe(false)
    expect(can({ kind: 'authenticated', permissions: new Set(['GET_CASHIERS', 'ROLE_MERCHANT_USER']) }, 'cashier.create', false)).toBe(false)
  })
})

describe('cashier create one-dispatch lifecycle', () => {
  it('blocks invalidated lookup and permission before any POST', async () => {
    let currentOptions: readonly TerminalOption[] | null = options
    let allowed = true
    let sends = 0
    const port = { create: async () => { sends++; return success } }
    const controller = createCashierCreateController({ currentScope: () => scope, canCreate: () => allowed,
      currentTerminalOptions: () => currentOptions, port: () => port, invalidateConfirmed: async () => undefined })
    currentOptions = null
    expect((await controller.submit(draft)).kind).toBe('not-sent')
    currentOptions = options
    allowed = false
    expect((await controller.submit(draft)).kind).toBe('not-sent')
    expect(sends).toBe(0)
  })

  it('latches double submit, confirms once, and invalidates only after confirmation', async () => {
    const flight = deferred<unknown>()
    let sends = 0
    let invalidations = 0
    const port = { create: () => { sends++; return flight.promise } }
    const controller = createCashierCreateController({ currentScope: () => scope, canCreate: () => true,
      currentTerminalOptions: () => options, port: () => port, invalidateConfirmed: async () => { invalidations++ } })
    const first = controller.submit(draft)
    const second = controller.submit(draft)
    flight.resolve(success)
    expect((await first).kind).toBe('confirmed')
    expect((await second).kind).toBe('not-sent')
    expect(sends).toBe(1)
    expect(invalidations).toBe(1)
    expect((await controller.submit(draft)).kind).toBe('not-sent')
    expect(sends).toBe(1)
  })

  it('keeps dispatched ambiguity unknown until a fresh explicit intent', async () => {
    let sends = 0
    const port = { create: async () => { sends++; throw new Error('timeout or dispatched 401') } }
    const controller = createCashierCreateController({ currentScope: () => scope, canCreate: () => true,
      currentTerminalOptions: () => options, port: () => port, invalidateConfirmed: async () => { throw new Error('should not invalidate') } })
    expect((await controller.submit(draft)).kind).toBe('unknown')
    expect((await controller.submit(draft)).kind).toBe('not-sent')
    expect(sends).toBe(1)
    expect(controller.beginNewIntent()).toBe(true)
    expect((await controller.submit(draft)).kind).toBe('unknown')
    expect(sends).toBe(2)
  })

  it('keeps known pre-dispatch failure not-sent and suppresses old-scope completion', async () => {
    let currentScope = scope
    const flight = deferred<unknown>()
    const port = { create: () => flight.promise }
    const controller = createCashierCreateController({ currentScope: () => currentScope, canCreate: () => true,
      currentTerminalOptions: () => options, port: () => port, invalidateConfirmed: async () => undefined })
    const pending = controller.submit(draft)
    currentScope = { ...scope, accessRevision: 2 }
    flight.resolve(success)
    expect((await pending).kind).toBe('stale')
    controller.invalidate()
    expect(controller.getState().intent).toBeNull()
    const preDispatchPort = { create: async () => { throw new ActionNotDispatchedError() } }
    const notSent = createCashierCreateController({ currentScope: () => scope, canCreate: () => true,
      currentTerminalOptions: () => options, port: () => preDispatchPort,
      invalidateConfirmed: async () => undefined })
    expect((await notSent.submit(draft)).kind).toBe('not-sent')
  })

  it('treats malformed success as unknown without replay', async () => {
    let sends = 0
    const port = { create: async () => { sends++; return { success: true } } }
    const controller = createCashierCreateController({ currentScope: () => scope, canCreate: () => true,
      currentTerminalOptions: () => options, port: () => port,
      invalidateConfirmed: async () => { throw new Error('must not refetch') } })
    expect((await controller.submit(draft)).kind).toBe('unknown')
    expect(sends).toBe(1)
  })

  it('keeps a distinct rejected path for a future proven classifier and does not guess from generic errors', async () => {
    const trustedPort = { create: async () => { throw new ActionBusinessRejectionError('Telefon allaqachon mavjud.') } }
    const trusted = createCashierCreateController({ currentScope: () => scope, canCreate: () => true,
      currentTerminalOptions: () => options, port: () => trustedPort,
      invalidateConfirmed: async () => undefined })
    expect(await trusted.submit(draft)).toMatchObject({ kind: 'rejected', reason: 'Telefon allaqachon mavjud.' })
    const ambiguousPort = { create: async () => { throw new Error('USER_ALREADY_EXISTS') } }
    const ambiguous = createCashierCreateController({ currentScope: () => scope, canCreate: () => true,
      currentTerminalOptions: () => options, port: () => ambiguousPort,
      invalidateConfirmed: async () => undefined })
    expect((await ambiguous.submit(draft)).kind).toBe('unknown')
  })

  it('does not downgrade confirmed create when list invalidation fails', async () => {
    const port = { create: async () => success }
    const controller = createCashierCreateController({ currentScope: () => scope, canCreate: () => true,
      currentTerminalOptions: () => options, port: () => port,
      invalidateConfirmed: async () => { throw new Error('refetch failed') } })
    expect((await controller.submit(draft)).kind).toBe('confirmed')
    expect(controller.getState().outcome.kind).toBe('confirmed')
  })

  it('invalidates every current-scope cashier variant only when read is granted', async () => {
    const client = new QueryClient()
    const first = readKeys.cashierList(scope, { search: '', page: 0, size: 10 })
    const second = readKeys.cashierList(scope, { search: 'X', page: 2, size: 25 })
    const otherScope = readKeys.cashierList({ ...scope, accessRevision: 2 }, { search: '', page: 0, size: 10 })
    const terminal = readKeys.terminals(scope)
    for (const key of [first, second, otherScope, terminal]) client.setQueryData(key, {})
    await invalidateCurrentCashierLists(client, scope, false)
    expect(client.getQueryState(first)?.isInvalidated).toBe(false)
    await invalidateCurrentCashierLists(client, scope, true)
    expect(client.getQueryState(first)?.isInvalidated).toBe(true)
    expect(client.getQueryState(second)?.isInvalidated).toBe(true)
    expect(client.getQueryState(otherScope)?.isInvalidated).toBe(false)
    expect(client.getQueryState(terminal)?.isInvalidated).toBe(false)
  })
})
