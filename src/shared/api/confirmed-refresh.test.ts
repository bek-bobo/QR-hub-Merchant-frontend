import { onlineManager, QueryClient, QueryObserver } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import { invalidateAfterConfirmed } from './one-dispatch-action'
import { createP5ResetController, invalidateCurrentP5Lists } from '@/features/p5/p5-reset'
import { invalidateCurrentCashierLists } from '@/features/cashiers/create-cashier'
import { invalidateConfirmedCreateReads } from '@/features/dynamic-qr/create-invalidation'
import { invalidateConfirmedCancelReads } from '@/features/dynamic-qr/cancel-invalidation'
import type { P5Row } from '@/shared/contracts/p5-read'

const scope = { source: 'live' as const, sessionScopeId: 'refresh', accessRevision: 1 }
const confirmed = { kind: 'confirmed' as const, data: null }
const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).reverse().forEach((cleanup) => cleanup()) })
function client() {
  const value = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  cleanups.push(() => value.clear())
  return value
}
function observe(value: QueryClient, feature: string, variant: string, queryFn: () => Promise<unknown>) {
  const key = [scope.source, scope.sessionScopeId, scope.accessRevision, feature, variant]
  value.setQueryData(key, { version: 'old' })
  const observer = new QueryObserver(value, { queryKey: key, queryFn, staleTime: Infinity, retry: false })
  cleanups.push(observer.subscribe(() => undefined))
  return key
}
const adapters = [
  { name: 'P5', feature: 'p5-list', invalidate: (c: QueryClient) => invalidateCurrentP5Lists(c, scope, true) },
  { name: 'cashier', feature: 'cashier-list', invalidate: (c: QueryClient) => invalidateCurrentCashierLists(c, scope, true) },
  { name: 'QR create', feature: 'dynamic-qrs', invalidate: (c: QueryClient) => invalidateConfirmedCreateReads(c, scope, true) },
  { name: 'QR cancel', feature: 'dynamic-qrs', invalidate: (c: QueryClient) => invalidateConfirmedCancelReads(c, scope, { dynamicQrRead: true, dashboardRead: true }) },
]
describe('F04 confirmed mutation refresh with real QueryClient', () => {
  it('does not infer refreshed data from an unverified resolved callback', async () => {
    expect(await invalidateAfterConfirmed({ result: confirmed, isCurrent: () => true,
      invalidate: async () => undefined })).toBe('skipped')
  })
  for (const adapter of adapters) {
    it.each([false, true])(`${adapter.name}: classifies actual active refetch failure=%s independently`, async (failure) => {
      const c = client()
      const key = observe(c, adapter.feature, 'active', async () => {
        if (failure) throw Error('synthetic refetch error')
        return { version: 'fresh' }
      })
      const refresh = await invalidateAfterConfirmed({ result: confirmed, isCurrent: () => true, invalidate: () => adapter.invalidate(c) })
      expect(c.getQueryState(key)?.status).toBe(failure ? 'error' : 'success')
      expect(refresh).toBe(failure ? 'failed' : 'updated')
      expect(confirmed.kind).toBe('confirmed')
    })
  }
  it('never reports full success for mixed relevant active queries', async () => {
    const c = client()
    const good = observe(c, 'dynamic-qrs', 'list', async () => ({ version: 'fresh' }))
    const bad = observe(c, 'dynamic-qr-stats', 'stats', async () => { throw Error('stats failed') })
    const refresh = await invalidateAfterConfirmed({ result: confirmed, isCurrent: () => true,
      invalidate: () => invalidateConfirmedCreateReads(c, scope, true) })
    expect(c.getQueryState(good)?.status).toBe('success')
    expect(c.getQueryState(bad)?.status).toBe('error')
    expect(refresh).toBe('failed')
  })
  it.each([false, true])('returns stale when scope changes during refresh (failure=%s)', async (failure) => {
    const c = client()
    let resolve!: (value: unknown) => void
    let reject!: (error: Error) => void
    let current = true
    observe(c, 'p5-list', 'held', () => new Promise((yes, no) => { resolve = yes; reject = no }))
    const flight = invalidateAfterConfirmed({ result: confirmed, isCurrent: () => current,
      invalidate: () => invalidateCurrentP5Lists(c, scope, true) })
    current = false
    if (failure) reject(Error('old scope refetch failed')); else resolve({ version: 'fresh' })
    expect(await flight).toBe('stale')
    expect(confirmed.kind).toBe('confirmed')
  })
  it.each([false, true])('skips refresh confirmation without relevant active queries (inactive cache=%s)', async (cached) => {
    const c = client()
    const key = ['live', 'refresh', 1, 'p5-list']
    if (cached) c.setQueryData(key, { version: 'old' })
    const refresh = await invalidateAfterConfirmed({ result: confirmed, isCurrent: () => true,
      invalidate: () => invalidateCurrentP5Lists(c, scope, true) })
    expect(refresh).toBe('skipped')
    if (cached) expect(c.getQueryState(key)?.isInvalidated).toBe(true)
  })
  it('keeps the P5 mutation confirmed while recording actual list refresh failure', async () => {
    const c = client()
    observe(c, 'p5-list', 'active', async () => { throw Error('read failed') })
    const row: P5Row = { deviceId: 'X', deviceStatus: 0, description: null, terminalName: 'T', terminalId: 't',
      terminalType: 'P5', merchantName: 'M', staticQrId: null, staticQrLink: null, staticQrStatus: null, createdAt: '2026-10-06T10:00:00' }
    const port = { reset: async () => ({ success: true, data: null }) }
    const controller = createP5ResetController({ currentScope: () => scope, canRead: () => true, canReset: () => true,
      currentRow: () => row, port: () => port, invalidateConfirmed: () => invalidateCurrentP5Lists(c, scope, true) })
    controller.request(row)
    expect((await controller.confirm()).kind).toBe('confirmed')
    expect(controller.getState().outcome.kind).toBe('confirmed')
    expect(controller.getState().refresh).toBe('failed')
  })
  it('does not report a paused offline refetch as updated', async () => {
    const c = client()
    const wasOnline = onlineManager.isOnline()
    onlineManager.setOnline(false)
    cleanups.push(() => onlineManager.setOnline(wasOnline))
    observe(c, 'p5-list', 'offline', async () => ({ version: 'fresh' }))
    expect(await invalidateAfterConfirmed({ result: confirmed, isCurrent: () => true,
      invalidate: () => invalidateCurrentP5Lists(c, scope, true) })).toBe('failed')
  })
  it('preserves confirmation with idle refresh when no active P5 read exists', async () => {
    const c = client()
    const row: P5Row = { deviceId: 'X', deviceStatus: 0, description: null, terminalName: 'T', terminalId: 't',
      terminalType: 'P5', merchantName: 'M', staticQrId: null, staticQrLink: null, staticQrStatus: null, createdAt: '2026-10-06T10:00:00' }
    const port = { reset: async () => ({ success: true, data: null }) }
    const controller = createP5ResetController({ currentScope: () => scope, canRead: () => true, canReset: () => true,
      currentRow: () => row, port: () => port, invalidateConfirmed: () => invalidateCurrentP5Lists(c, scope, true) })
    controller.request(row)
    await controller.confirm()
    expect(controller.getState().outcome.kind).toBe('confirmed')
    expect(controller.getState().refresh).toBe('idle')
  })
})
