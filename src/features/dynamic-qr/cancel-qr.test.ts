import { describe, expect, it } from 'vitest'
import { can } from '@/shared/auth/access'
import { safeBusinessError } from '@/shared/api/errors'
import { readKeys } from '@/shared/api/read-keys'
import type { DynamicQrRow, ReadScope } from '@/shared/contracts/merchant-read'
import { createCancelQrController, decodeCancelQrSuccess, productionCancelGate, type CancelQrPort } from './cancel-qr'
import { shouldInvalidateAfterCancel } from './cancel-invalidation'

const scope: ReadScope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const row: DynamicQrRow = {
  pkey: 'actual-row-pkey', link: null, terminalType: null, terminalId: null,
  createdAt: '2026-09-17T12:00:00', updatedAt: null, terminalName: 'A', merchantId: null,
  merchantName: 'M', bankAccountId: null, bankAccountName: null,
  amount: { minorUnits: '100000', currency: 'UZS', scale: 2 }, currencyAmount: null,
  currencyCode: null, rate: null, serviceFeeAmount: null, statusCode: 0,
  distributionStatus: null, rrn: null,
}
const success = { success: true, data: null }
const accepted = { kind: 'response' as const, ok: true, status: 200, body: success }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('cancel QR fake boundary', () => {
  it('accepts only exact explicit null-data success', () => {
    expect(decodeCancelQrSuccess(accepted)).toBeNull()
    for (const payload of [{}, { success: 'true', data: null }, { success: true },
      { success: true, data: {} }, { success: false, data: null }]) {
      expect(() => decodeCancelQrSuccess({ ...accepted, body: payload })).toThrow()
    }
    expect(() => decodeCancelQrSuccess({ ...accepted, status: 202 })).toThrow()
    expect(() => decodeCancelQrSuccess({ ...accepted, ok: false })).toThrow()
  })

  it('keeps cancel authority independent of create, export and read grants', () => {
    const access = { kind: 'authenticated' as const, permissions: new Set(['CANCEL_PAYMENT']) }
    expect(can(access, 'dynamicQr.cancel', false)).toBe(true)
    expect(can(access, 'dynamicQr.create', false)).toBe(false)
    expect(can(access, 'dynamicQr.export', false)).toBe(false)
    expect(can(access, 'dynamicQr.read', false)).toBe(false)
  })

  it('blocks absent permission, absent port, and unknown status without dispatch', async () => {
    let sends = 0
    const port: CancelQrPort = { cancel: async () => { sends++; return accepted } }
    const make = (canCancel: () => boolean, registered: () => CancelQrPort | null) =>
      createCancelQrController({ currentScope: () => scope, canCancel, eligibleRow: () => true, port: registered })
    expect(make(() => false, () => port).request(row)).toBe(false)
    expect(make(() => true, () => null).request(row)).toBe(false)
    expect(createCancelQrController({ currentScope: () => scope, canCancel: () => true,
      eligibleRow: () => false, port: () => port }).request(row)).toBe(false)
    expect(make(() => true, () => port).request({ ...row, statusCode: 999 })).toBe(false)
    expect(make(() => true, () => port).request({ ...row, pkey: '  ' })).toBe(false)
    expect(sends).toBe(0)
  })

  it('keeps production gate closed for every known numeric status', () => {
    for (const statusCode of [0, 5, 10, 20, 25, 50]) {
      const controller = createCancelQrController({ currentScope: () => scope, canCancel: () => true,
        ...productionCancelGate })
      expect(controller.request({ ...row, statusCode })).toBe(false)
      expect(controller.getState().outcome.kind).toBe('idle')
    }
  })

  it('requires explicit confirmation and sends the row pkey once after preparation', async () => {
    const order: string[] = []
    const gate = deferred<typeof accepted>()
    const port: CancelQrPort = { cancel: (request) => { order.push(request.pkey); return gate.promise } }
    const controller = createCancelQrController({
      currentScope: () => scope, canCancel: () => true, eligibleRow: () => true, port: () => port,
      prepare: async () => { order.push('prepare'); return true },
    })
    expect(controller.request(row)).toBe(true)
    expect(controller.getState().confirmation?.pkey).toBe(row.pkey)
    controller.dismiss()
    expect(order).toEqual([])
    expect(controller.request(row)).toBe(true)
    const first = controller.confirm()
    const duplicate = controller.confirm()
    gate.resolve(accepted)
    expect((await first).kind).toBe('confirmed')
    expect((await duplicate).kind).toBe('not-sent')
    expect((await controller.confirm()).kind).toBe('not-sent')
    expect(order).toEqual(['prepare', 'actual-row-pkey'])
  })

  it('does not send when preparation or permission fails before dispatch', async () => {
    let permitted = true
    let sends = 0
    const port: CancelQrPort = { cancel: async () => { sends++; return accepted } }
    const controller = createCancelQrController({
      currentScope: () => scope, canCancel: () => permitted, eligibleRow: () => true, port: () => port,
      prepare: async () => { permitted = false; return true },
    })
    expect(controller.request(row)).toBe(true)
    expect((await controller.confirm()).kind).toBe('not-sent')
    expect(sends).toBe(0)
  })

  it('keeps 401-like and transport failure unknown with no replay', async () => {
    for (const error of [Error('401'), Error('connection lost'), safeBusinessError({ code: 1 })]) {
      let sends = 0
      const port: CancelQrPort = { cancel: async () => { sends++; throw error } }
      const controller = createCancelQrController({
        currentScope: () => scope, canCancel: () => true, eligibleRow: () => true, port: () => port,
      })
      controller.request(row)
      expect((await controller.confirm()).kind).toBe('unknown')
      expect((await controller.confirm()).kind).toBe('not-sent')
      expect(sends).toBe(1)
      expect(controller.beginNewIntent(false)).toBe(false)
      expect(sends).toBe(1)
      expect(controller.beginNewIntent(true)).toBe(true)
    }
  })

  it('treats malformed response as unknown and explicit sanitized rejection as rejected', async () => {
    const malformedPort: CancelQrPort = { cancel: async () => ({ ...accepted, body: {} }) }
    const malformed = createCancelQrController({ currentScope: () => scope, canCancel: () => true,
      eligibleRow: () => true, port: () => malformedPort })
    malformed.request(row)
    expect((await malformed.confirm()).kind).toBe('unknown')
    const rejectionPort: CancelQrPort = { cancel: async () => ({ kind: 'business-rejection' }) }
    const rejected = createCancelQrController({ currentScope: () => scope, canCancel: () => true,
      eligibleRow: () => true, port: () => rejectionPort })
    rejected.request(row)
    expect(await rejected.confirm()).toEqual({ kind: 'rejected', reason: 'Bekor qilish so‘rovi rad etildi.' })
    expect((await rejected.confirm()).kind).toBe('not-sent')
  })

  it('suppresses late outcome and invalidation after scope or permission loss', async () => {
    for (const change of ['scope', 'permission'] as const) {
      const gate = deferred<typeof accepted>()
      const started = deferred<void>()
      let current = scope
      let permitted = true
      let invalidations = 0
      const port: CancelQrPort = { cancel: () => { started.resolve(); return gate.promise } }
      const controller = createCancelQrController({ currentScope: () => current,
        canCancel: () => permitted, eligibleRow: () => true,
        port: () => port,
        invalidateConfirmed: async () => { invalidations++ },
      })
      controller.request(row)
      const flight = controller.confirm()
      await started.promise
      if (change === 'scope') current = { ...scope, sessionScopeId: 'session-b' }
      else permitted = false
      gate.resolve(accepted)
      expect((await flight).kind).toBe('stale')
      expect(invalidations).toBe(0)
      expect(controller.getState().outcome.kind).toBe('idle')
    }
  })

  it('keeps confirmed result when invalidation fails and never changes source row status', async () => {
    const port: CancelQrPort = { cancel: async () => accepted }
    const controller = createCancelQrController({ currentScope: () => scope, canCancel: () => true,
      eligibleRow: () => true, port: () => port,
      invalidateConfirmed: async () => { throw Error('refetch failed') },
    })
    controller.request(row)
    expect((await controller.confirm()).kind).toBe('confirmed')
    expect(controller.getState().outcome.kind).toBe('confirmed')
    expect(controller.getState().refresh).toBe('failed')
    expect(row.statusCode).toBe(0)
  })

  it('requires a new explicit intent before a second fake cancel', async () => {
    let sends = 0
    const port: CancelQrPort = { cancel: async () => { sends++; return accepted } }
    const controller = createCancelQrController({ currentScope: () => scope, canCancel: () => true,
      eligibleRow: () => true, port: () => port })
    expect(controller.request(row)).toBe(true)
    expect((await controller.confirm()).kind).toBe('confirmed')
    expect(controller.request(row)).toBe(false)
    expect(sends).toBe(1)
    expect(controller.beginNewIntent(true)).toBe(true)
    expect(sends).toBe(1)
    expect(controller.request(row)).toBe(true)
    expect((await controller.confirm()).kind).toBe('confirmed')
    expect(sends).toBe(2)
  })

  it('selects only current permitted dynamic list and dashboard keys after confirmation', async () => {
    const filters = { fromDate: '2026-09-01', toDate: '2026-09-17', search: '', page: 0, size: 10 as const }
    const list = readKeys.dynamicQrs(scope, filters)
    const dashboard = readKeys.dashboard(scope, filters)
    const staticQr = readKeys.staticQrs(scope, undefined, 0, 10)
    const otherScope = readKeys.dynamicQrs({ ...scope, accessRevision: 2 }, filters)
    expect([list, dashboard, staticQr, otherScope].filter((key) =>
      shouldInvalidateAfterCancel(key, scope, { dynamicQrRead: true, dashboardRead: true })))
      .toEqual([list, dashboard])
    expect(shouldInvalidateAfterCancel(dashboard, scope, { dynamicQrRead: true, dashboardRead: false })).toBe(false)
    const selected: (readonly unknown[])[] = []
    const port: CancelQrPort = { cancel: async () => accepted }
    const controller = createCancelQrController({ currentScope: () => scope, canCancel: () => true,
      eligibleRow: () => true, port: () => port,
      invalidateConfirmed: async (captured) => {
        selected.push(...[list, dashboard, staticQr, otherScope].filter((key) =>
          shouldInvalidateAfterCancel(key, captured, { dynamicQrRead: true, dashboardRead: false })))
      },
    })
    controller.request(row)
    expect((await controller.confirm()).kind).toBe('confirmed')
    expect(selected).toEqual([list])
  })
})
