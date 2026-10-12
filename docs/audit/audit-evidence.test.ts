import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { createActionRegistry, invalidateAfterConfirmed } from '@/shared/api/one-dispatch-action'
import { createAssignTerminalsController } from '@/features/cashiers/assign-terminals'
import { createUnassignTerminalController } from '@/features/cashiers/unassign-terminal'
import { createP5ResetController, invalidateCurrentP5Lists, p5ResetIntentKey } from '@/features/p5/p5-reset'
import type { P5Row } from '@/shared/contracts/p5-read'
import type { CashierRow } from '@/shared/contracts/management-read'

const scope = { source: 'live' as const, sessionScopeId: 'audit', accessRevision: 1 }
const terminal = { id: 'existing', name: 'Existing', statusCode: 0 }
const cashier: CashierRow = { id: '41', fullname: 'Audit', phone: '998901234567',
  statusCode: 0, roleDisplay: null, createdAt: null, updatedAt: null, terminals: [terminal] }
const success = { success: true, data: null }

describe('Audit evidence: F01/F02/F03/F04 regressions', () => {
  it('assignment subscription cleanup retains one dispatch until the original settles', async () => {
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
    const unsubscribe = first.subscribe(() => undefined)
    unsubscribe() // Panel teardown detaches the UI, not the durable action.
    const reopened = registry.getOrCreate('same-panel-key', factory)
    expect(reopened).toBe(first)
    const duplicate = reopened.submit(['new'])
    await Promise.resolve()
    expect(assign).toHaveBeenCalledTimes(1)
    expect(reopened.getState().outcome.kind).toBe('pending')
    resolve(success)
    expect((await pending).kind).toBe('confirmed')
    expect((await duplicate).kind).toBe('not-sent')
    registry.invalidateAll()
  })

  it('retained unassign controller reads current owner selection on reopening', () => {
    const registry = createActionRegistry()
    let epoch = 1
    const target = { cashier, terminal }
    let selection: { target: typeof target; epoch: number } | null = { target, epoch }
    const currentTarget = () => selection?.epoch === epoch ? selection.target : null
    const mount = () => registry.getOrCreate('same-unassign-key', () => createUnassignTerminalController({
        currentScope: () => scope, currentTarget,
        canUnassign: () => true, port: () => null, invalidateConfirmed: async () => undefined,
      }))
    const first = mount()
    expect(first.isCurrentSelection()).toBe(true)
    epoch++ // CashierPage cancellation/reselection increments selection epoch.
    selection = null
    expect(first.isCurrentSelection()).toBe(false)
    selection = { target: { cashier, terminal }, epoch }
    const reopened = mount()
    expect(reopened).toBe(first)
    expect(reopened.isCurrentSelection()).toBe(true)
    expect(reopened.armConfirmation()).toBe(true)
    registry.invalidateAll()
  })

  it('confirmed refresh detects an observed refetch error despite default QueryClient swallowing it', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const queryKey = ['live', 'audit', 1, 'p5-list']
    client.setQueryData(queryKey, { content: [] })
    const observer = new QueryObserver(client, { queryKey, staleTime: Infinity,
      queryFn: async () => { throw new Error('synthetic refetch failure') } })
    const unsubscribe = observer.subscribe(() => undefined)
    const result = await invalidateAfterConfirmed({ result: { kind: 'confirmed', data: null },
      isCurrent: () => true, invalidate: () => invalidateCurrentP5Lists(client, scope, true) })
    expect(client.getQueryState(queryKey)?.status).toBe('error')
    expect(result).toBe('failed')
    unsubscribe()
    client.clear()
  })

  it('device-scoped P5 retention reads the current filter result resolver', () => {
    const registry = createActionRegistry()
    const oldRow: P5Row = { deviceId: 'audit-device', deviceStatus: 0, description: null,
      terminalName: 'Audit terminal', terminalId: 'terminal', terminalType: 'P5',
      merchantName: 'Audit merchant', staticQrId: null, staticQrLink: null,
      staticQrStatus: null, createdAt: '2026-10-06T10:00:00' }
    const newRow = { ...oldRow }
    const port = { reset: async () => success }
    let visibleRow: P5Row | null = oldRow
    const currentRow = () => visibleRow
    const mount = (row: P5Row) => registry.getOrCreate(p5ResetIntentKey(scope, row.deviceId),
      () => createP5ResetController({ currentScope: () => scope, canRead: () => true,
        canReset: () => true, currentRow, port: () => port,
        invalidateConfirmed: async () => undefined }))
    const first = mount(oldRow)
    expect(first.request(oldRow)).toBe(true)
    first.dismiss()
    expect(first.beginNewIntent(false)).toBe(true)
    visibleRow = newRow
    const afterFilterChange = mount(newRow)
    expect(afterFilterChange).toBe(first)
    expect(afterFilterChange.request(newRow)).toBe(true)
    afterFilterChange.dismiss()
    visibleRow = null
    expect(afterFilterChange.request(oldRow)).toBe(false)
    registry.invalidateAll()
  })
})
