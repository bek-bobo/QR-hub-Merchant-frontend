import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { createActionRegistry, invalidateAfterConfirmed } from '@/shared/api/one-dispatch-action'
import { createAssignTerminalsController } from '@/features/cashiers/assign-terminals'
import { createUnassignTerminalController } from '@/features/cashiers/unassign-terminal'
import { createP5ResetController, p5ResetIntentKey } from '@/features/p5/p5-reset'
import type { P5Row } from '@/shared/contracts/p5-read'
import type { CashierRow } from '@/shared/contracts/management-read'

const scope = { source: 'live' as const, sessionScopeId: 'audit', accessRevision: 1 }
const terminal = { id: 'existing', name: 'Existing', statusCode: 0 }
const cashier: CashierRow = { id: '41', fullname: 'Audit', phone: '998901234567',
  statusCode: 0, roleDisplay: null, createdAt: null, updatedAt: null, terminals: [terminal] }
const success = { success: true, data: null }

describe('Audit reproductions: assertions describe current defects, not desired behavior', () => {
  it('assignment panel cleanup permits a second dispatch before the first settles', async () => {
    const registry = createActionRegistry()
    let resolve!: (value: unknown) => void
    const flight = new Promise<unknown>((yes) => { resolve = yes })
    const assign = vi.fn(() => flight)
    const port = { assign }
    const factory = () => createAssignTerminalsController({ currentScope: () => scope,
      currentTarget: () => cashier, currentOptions: () => [{ id: 'new', name: 'New' }],
      canAssign: () => true, port: () => port, invalidateConfirmed: async () => undefined })
    const first = registry.getOrCreate('same-panel-key', factory)
    const pending = first.submit(['new'])
    await Promise.resolve()
    expect(assign).toHaveBeenCalledTimes(1)
    first.invalidate() // AssignTerminalsPanel effect cleanup on close.
    const reopened = registry.getOrCreate('same-panel-key', factory)
    expect(reopened).toBe(first)
    const duplicate = reopened.submit(['new'])
    await Promise.resolve()
    expect(assign).toHaveBeenCalledTimes(2)
    resolve(success)
    await Promise.all([pending, duplicate])
    registry.invalidateAll()
  })

  it('retained unassign controller keeps the first selection epoch on reopening', () => {
    const registry = createActionRegistry()
    let epoch = 1
    const target = { cashier, terminal }
    const mount = () => {
      const capturedEpoch = epoch
      return registry.getOrCreate('same-unassign-key', () => createUnassignTerminalController({
        currentScope: () => scope, currentTarget: () => epoch === capturedEpoch ? target : null,
        canUnassign: () => true, port: () => null, invalidateConfirmed: async () => undefined,
      }))
    }
    const first = mount()
    expect(first.isCurrentSelection()).toBe(true)
    epoch++ // CashierPage cancellation/reselection increments selection epoch.
    const reopened = mount()
    expect(reopened).toBe(first)
    expect(reopened.isCurrentSelection()).toBe(false)
    expect(reopened.armConfirmation()).toBe(false)
    registry.invalidateAll()
  })

  it('real QueryClient invalidation resolves updated despite an observed refetch error', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const queryKey = ['live', 'audit', 1, 'p5-list']
    client.setQueryData(queryKey, { content: [] })
    const observer = new QueryObserver(client, { queryKey, staleTime: Infinity,
      queryFn: async () => { throw new Error('synthetic refetch failure') } })
    const unsubscribe = observer.subscribe(() => undefined)
    const result = await invalidateAfterConfirmed({ result: { kind: 'confirmed', data: null },
      isCurrent: () => true, invalidate: () => client.invalidateQueries({ queryKey }) })
    expect(client.getQueryState(queryKey)?.status).toBe('error')
    expect(result).toBe('updated')
    unsubscribe()
    client.clear()
  })

  it('device-scoped P5 retention keeps a previous filter result resolver', () => {
    const registry = createActionRegistry()
    const oldRow: P5Row = { deviceId: 'audit-device', deviceStatus: 0, description: null,
      terminalName: 'Audit terminal', terminalId: 'terminal', terminalType: 'P5',
      merchantName: 'Audit merchant', staticQrId: null, staticQrLink: null,
      staticQrStatus: null, createdAt: '2026-10-06T10:00:00' }
    const newRow = { ...oldRow }
    const port = { reset: async () => success }
    const mount = (row: P5Row) => registry.getOrCreate(p5ResetIntentKey(scope, row.deviceId),
      () => createP5ResetController({ currentScope: () => scope, canRead: () => true,
        canReset: () => true, currentRow: () => row, port: () => port,
        invalidateConfirmed: async () => undefined }))
    const first = mount(oldRow)
    expect(first.request(oldRow)).toBe(true)
    first.dismiss()
    expect(first.beginNewIntent(false)).toBe(true)
    const afterFilterChange = mount(newRow)
    expect(afterFilterChange).toBe(first)
    expect(afterFilterChange.request(newRow)).toBe(false)
    registry.invalidateAll()
  })
})
