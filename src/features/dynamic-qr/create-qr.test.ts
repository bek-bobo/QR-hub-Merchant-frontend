import { describe, expect, it } from 'vitest'
import { decodeCurrencyOptionsResponse } from '@/shared/contracts/currency.contract'
import { decodeCreateTerminalOptionsResponse } from '@/shared/contracts/terminal-lookup.contract'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { can } from '@/shared/auth/access'
import { createAmountBounds, buildCreateQrRequest, createCreateQrController, decodeCreateQrSuccess, isCurrentCreateQrRequest } from './create-qr'
import { shouldInvalidateAfterCreate } from './create-invalidation'
import { readKeys } from '@/shared/api/read-keys'
import { presentCreateResult } from './create-result'

const terminals = decodeCreateTerminalOptionsResponse({ success: true, data: [
  { id: '0123456789abcdef0123456789abcdef', name: 'A', minAmount: 100000, maxAmount: 2000000000 },
] })
const currencies = decodeCurrencyOptionsResponse([{ code: 'ABC', nameUz: null, nameRu: null, nameEn: null, status: -1 }])
const draft = { terminalId: terminals[0].id, amountInput: '1000,00', currencyCode: 'ABC' }
const input = { draft, terminals, currencies, terminalLookupAllowed: true, currencyLookupAllowed: true }
const response = { success: true, data: { pkey: 'opaque-key', link: 'https://example.test/pay?x=1&y=2' } }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => { resolve = yes })
  return { promise, resolve }
}

describe('create QR contract and controller', () => {
  it('intersects terminal limits with global UZS minor bounds', () => {
    const narrow = { ...terminals[0], minAmountMinor: '100001', maxAmountMinor: '200000' }
    expect(createAmountBounds(narrow)).toEqual({ minimum: 100001n, maximum: 200000n })
    expect(buildCreateQrRequest({ ...input, terminals: [narrow] })).toBeNull()
    expect(buildCreateQrRequest({ ...input, draft: { ...draft, amountInput: '1000.01' }, terminals: [narrow] }))
      .toEqual({ terminalId: draft.terminalId, amount: 100001, currencyCode: 'ABC' })
    expect(createAmountBounds({ ...narrow, minAmountMinor: '2000000001' })).toBeNull()
    expect(createAmountBounds({ ...narrow, minAmountMinor: '200001' })).toBeNull()
  })

  it('rejects absent, invalid or disappeared terminal limits without affecting other reads', () => {
    expect(buildCreateQrRequest({ ...input, terminals: null })).toBeNull()
    expect(buildCreateQrRequest({ ...input, terminalLookupAllowed: false })).toBeNull()
    expect(buildCreateQrRequest({ ...input, draft: { ...draft, terminalId: 'missing' } })).toBeNull()
    expect(buildCreateQrRequest({ ...input, terminals: [{ ...terminals[0], id: 'invalid' }], draft: { ...draft, terminalId: 'invalid' } })).toBeNull()
    expect(buildCreateQrRequest({ ...input, terminals: [{ ...terminals[0], minAmountMinor: 'bad' }] })).toBeNull()
    expect(buildCreateQrRequest({ ...input, terminals: [{ ...terminals[0], minAmountMinor: '200', maxAmountMinor: '100' }] })).toBeNull()
  })

  it('does not invent a currency default or infer selectability from status', () => {
    expect(buildCreateQrRequest({ ...input, draft: { ...draft, currencyCode: '' } })).toBeNull()
    expect(buildCreateQrRequest(input)).toEqual({ terminalId: draft.terminalId, amount: 100000, currencyCode: 'ABC' })
    expect(buildCreateQrRequest({ ...input, draft: { ...draft, amountInput: '1 000.00' } }))
      .toEqual({ terminalId: draft.terminalId, amount: 100000, currencyCode: 'ABC' })
    expect(buildCreateQrRequest({ ...input, currencies: null })).toBeNull()
    expect(buildCreateQrRequest({ ...input, currencyLookupAllowed: false })).toBeNull()
    expect(buildCreateQrRequest({ ...input, draft: { ...draft, currencyCode: 'UZS' } })).toBeNull()
    expect(buildCreateQrRequest({ ...input, currencies: decodeCurrencyOptionsResponse([{ code: 'abc', status: 0 }]), draft: { ...draft, currencyCode: 'abc' } })).toBeNull()
  })

  it('rechecks the exact request against current terminal limits and currency catalog', () => {
    const request = { terminalId: draft.terminalId, amount: 100000, currencyCode: 'ABC' }
    expect(isCurrentCreateQrRequest(request, terminals, currencies)).toBe(true)
    expect(isCurrentCreateQrRequest(request, [], currencies)).toBe(false)
    expect(isCurrentCreateQrRequest(request, terminals, [])).toBe(false)
    expect(isCurrentCreateQrRequest({ ...request, amount: 99999 }, terminals, currencies)).toBe(false)
    expect(isCurrentCreateQrRequest({ ...request, amount: 100000.5 }, terminals, currencies)).toBe(false)
  })

  it('preserves exact source success fields and rejects malformed success', () => {
    expect(decodeCreateQrSuccess(response)).toEqual(response.data)
    expect(() => decodeCreateQrSuccess({ success: true, data: { pkey: '', link: 'x' } })).toThrow()
    expect(() => decodeCreateQrSuccess({ success: true, data: { pkey: 'p', link: null } })).toThrow()
  })

  it('blocks live and direct programmatic submit without a registered port', async () => {
    const controller = createCreateQrController({
      currentScope: () => ({ source: 'live', sessionScopeId: 'a', accessRevision: 1 }),
      canCreate: () => true,
      port: () => null,
    })
    expect((await controller.submit(input)).kind).toBe('not-sent')
    expect(controller.getSnapshot().kind).toBe('idle')
  })

  it('keeps create capability independent and requires only its own lookups', async () => {
    const access = { kind: 'authenticated' as const, permissions: new Set(['CREATE_DYNAMIC_QR', 'GET_DROPDOWN_TERMINALS', 'GET_CURRENCY_CODE']) }
    expect(can(access, 'dynamicQr.create', false)).toBe(true)
    expect(can(access, 'dynamicQr.read', false)).toBe(false)
    expect(can(access, 'dashboard.read', false)).toBe(false)
    let sends = 0
    let received: unknown = null
    const port = { create: async (request: unknown) => { sends++; received = request; return response } }
    const denied = createCreateQrController({
      currentScope: () => ({ source: 'live', sessionScopeId: 'a', accessRevision: 1 }),
      canCreate: () => false, port: () => port,
    })
    expect((await denied.submit(input)).kind).toBe('not-sent')
    expect(sends).toBe(0)
    const controller = createCreateQrController({
      currentScope: () => ({ source: 'live', sessionScopeId: 'a', accessRevision: 1 }),
      canCreate: () => true, port: () => port,
    })
    expect((await controller.submit({ ...input, currencyLookupAllowed: false })).kind).toBe('not-sent')
    expect(sends).toBe(0)
    expect((await controller.submit(input)).kind).toBe('confirmed')
    expect(sends).toBe(1)
    expect(received).toEqual({ terminalId: draft.terminalId, amount: 100000, currencyCode: 'ABC' })
  })

  it('latches duplicate submits and keeps confirmed fake-port result', async () => {
    const gate = deferred<unknown>()
    let sends = 0
    const port = { create: () => { sends++; return gate.promise } }
    const controller = createCreateQrController({
      currentScope: () => ({ source: 'live', sessionScopeId: 'a', accessRevision: 1 }),
      canCreate: () => true, port: () => port,
    })
    const first = controller.submit(input)
    expect((await controller.submit(input)).kind).toBe('not-sent')
    await Promise.resolve()
    gate.resolve(response)
    expect(await first).toEqual({ kind: 'confirmed', data: response.data })
    expect((await controller.submit(input)).kind).toBe('not-sent')
    expect(sends).toBe(1)
  })

  it('keeps dispatched failure or malformed success unknown until a new intent', async () => {
    let sends = 0
    const port = { create: async () => { sends++; return { success: true, data: { pkey: 'p' } } } }
    const controller = createCreateQrController({
      currentScope: () => ({ source: 'live', sessionScopeId: 'a', accessRevision: 1 }),
      canCreate: () => true, port: () => port,
    })
    expect((await controller.submit(input)).kind).toBe('unknown')
    expect(controller.getSnapshot().kind).toBe('unknown')
    expect((await controller.submit(input)).kind).toBe('not-sent')
    expect(sends).toBe(1)
    expect(controller.beginNewIntent()).toBe(true)
    expect((await controller.submit(input)).kind).toBe('unknown')
    expect(sends).toBe(2)
  })

  it('drops stale fake-port completion and never invalidates another scope', async () => {
    const gate = deferred<unknown>()
    let scope: ReadScope = { source: 'live', sessionScopeId: 'a', accessRevision: 1 }
    let invalidations = 0
    const port = { create: () => gate.promise }
    const controller = createCreateQrController({
      currentScope: () => scope, canCreate: () => true, port: () => port,
      invalidateConfirmed: async () => { invalidations++ },
    })
    const flight = controller.submit(input)
    await Promise.resolve()
    scope = { ...scope, accessRevision: 2 }
    gate.resolve(response)
    expect((await flight).kind).toBe('stale')
    expect(invalidations).toBe(0)
  })

  it('keeps confirmed outcome when its read invalidation fails', async () => {
    const port = { create: async () => response }
    const controller = createCreateQrController({
      currentScope: () => ({ source: 'live', sessionScopeId: 'a', accessRevision: 1 }),
      canCreate: () => true, port: () => port,
      invalidateConfirmed: async () => { throw Error('refetch') },
    })
    expect((await controller.submit(input)).kind).toBe('confirmed')
    expect(controller.getSnapshot().kind).toBe('confirmed')
  })

  it('confirmed fake create selects only owned read namespaces', async () => {
    const scope: ReadScope = { source: 'live', sessionScopeId: 'a', accessRevision: 1 }
    const filters = { fromDate: '2026-09-01', toDate: '2026-09-17', search: '', page: 0, size: 10 as const }
    const keys = [
      readKeys.dynamicQrs(scope, filters),
      readKeys.dashboard(scope, filters),
      readKeys.staticQrs(scope, undefined, 0, 10),
      readKeys.dynamicQrs({ ...scope, sessionScopeId: 'b' }, filters),
    ]
    let selected: readonly (readonly unknown[])[] = []
    const port = { create: async () => response }
    const controller = createCreateQrController({
      currentScope: () => scope, canCreate: () => true, port: () => port,
      invalidateConfirmed: async (captured) => {
        selected = keys.filter((key) => shouldInvalidateAfterCreate(key, captured, true))
      },
    })
    expect((await controller.submit(input)).kind).toBe('confirmed')
    expect(selected).toEqual([keys[0]])
  })

  it('keeps confirmed creation when the returned link is presentation-invalid; close and new intent never send', async () => {
    let sends = 0
    const port = { create: async () => {
      sends++
      return { success: true, data: { pkey: 'opaque-pkey', link: 'javascript:alert(1)' } }
    } }
    const controller = createCreateQrController({
      currentScope: () => ({ source: 'live', sessionScopeId: 'a', accessRevision: 1 }),
      canCreate: () => true, port: () => port,
    })
    expect((await controller.submit(input)).kind).toBe('confirmed')
    expect(presentCreateResult(controller.getState())).toMatchObject({
      kind: 'confirmed', pkey: 'opaque-pkey', link: { kind: 'unavailable' },
    })
    controller.closeResult()
    expect(presentCreateResult(controller.getState())).toBeNull()
    expect(sends).toBe(1)
    expect(controller.beginNewIntent()).toBe(true)
    expect(controller.getSnapshot().kind).toBe('idle')
    expect(sends).toBe(1)
  })
})
