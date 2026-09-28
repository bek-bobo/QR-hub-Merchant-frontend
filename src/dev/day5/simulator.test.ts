import { describe, expect, it } from 'vitest'
import { createReadRuntime } from '@/app/read/read-runtime'
import { createCashierCreateController } from '@/features/cashiers/create-cashier'
import { createUnassignTerminalController } from '@/features/cashiers/unassign-terminal'
import { resolveSafeReturnTo } from '@/app/safe-return-to'
import { resolveRuntimeMode } from '@/shared/config/runtime'
import { createDay5Simulator, day5ScenarioNames } from './simulator'

const signal = new AbortController().signal

describe('D5-MGMT-DEMO-ONLY scenario boundary', () => {
  it('keeps exact production routes while rejecting DEV return targets', () => {
    expect(resolveSafeReturnTo('/cashiers/new')).toBe('/cashiers/new')
    expect(resolveSafeReturnTo('/dev/day5/cashiers')).toBe('/account')
    expect(resolveSafeReturnTo('/dev/day5/terminals')).toBe('/account')
    expect(resolveSafeReturnTo('/dev/day5/bank-accounts')).toBe('/account')
    expect(resolveRuntimeMode('demo', false)).toBe('live')
    expect(day5ScenarioNames).toContain('UNASSIGN_ONLY')
    expect(day5ScenarioNames).toContain('PERMISSION_REVOKED')
  })

  it('uses normalized read gates so CREATE_ONLY never dispatches cashier GET', async () => {
    const demo = createDay5Simulator('CREATE_ONLY')
    const runtime = createReadRuntime(demo.api, demo.currentState)
    expect(runtime.cashierListOptions({ search: '', page: 0, size: 10 }).enabled).toBe(false)
    expect(runtime.terminalLookupOptions().enabled).toBe(true)
    await runtime.api.terminalsForMerchant(undefined, signal)
    expect(demo.getSnapshot().counters.cashierList).toBe(0)
    expect(demo.getSnapshot().counters.terminalLookup).toBe(1)
  })

  it('keeps independent per-endpoint counters and server-side totals', async () => {
    const demo = createDay5Simulator('NORMAL')
    const runtime = createReadRuntime(demo.api, demo.currentState)
    const terminals = await runtime.api.terminalList({ search: '', page: 1, size: 10 }, signal)
    const banks = await runtime.api.bankAccountList({ search: '000', page: 0, size: 10 }, signal)
    await runtime.api.merchantLookup(signal)
    expect(terminals).toMatchObject({ page: 1, totalElements: 12, totalPages: 2 })
    expect(terminals.content).toHaveLength(2)
    expect(banks.content[0].accountNumber.startsWith('000')).toBe(true)
    expect(demo.getSnapshot().counters).toMatchObject({ terminalList: 1, bankAccountList: 1, merchantLookup: 1, cashierList: 0, create: 0, assign: 0, unassign: 0 })
    demo.resetCounters()
    expect(Object.values(demo.getSnapshot().counters).every((count) => count === 0)).toBe(true)
  })

  it('requires confirmation and ACTIVE membership for one unassign DELETE', async () => {
    const demo = createDay5Simulator('UNASSIGN_ONLY')
    const page = await demo.api.cashierList({ search: '', page: 0, size: 10 }, signal)
    const cashier = page.content.find((row) => row.terminals.length > 0)
    if (!cashier) throw new Error('Missing synthetic active membership')
    const target = { cashier, terminal: cashier.terminals[0] }
    let currentTarget: typeof target | null = target
    const controller = createUnassignTerminalController({
      currentScope: demo.getCurrentScope, currentTarget: () => currentTarget,
      canUnassign: () => demo.has('cashier.unassignTerminal'), port: () => demo.ports.unassign,
      invalidateConfirmed: async () => undefined,
    })
    expect((await controller.submit()).kind).toBe('not-sent')
    expect(demo.getSnapshot().counters.unassign).toBe(0)
    controller.armConfirmation()
    currentTarget = null
    expect((await controller.submit()).kind).toBe('not-sent')
    expect(demo.getSnapshot().counters.unassign).toBe(0)
    currentTarget = target
    controller.armConfirmation()
    expect((await controller.submit()).kind).toBe('confirmed')
    expect(demo.getSnapshot().counters.unassign).toBe(1)
    expect(cashier.terminals).toHaveLength(1)
    const refreshed = await demo.api.cashierList({ search: '', page: 0, size: 10 }, signal)
    expect(refreshed.content.find((row) => row.id === cashier.id)?.terminals).toHaveLength(0)
    const historicalMatch = await demo.api.cashierList({ terminalId: target.terminal.id, search: '', page: 0, size: 10 }, signal)
    expect(historicalMatch.content.find((row) => row.id === cashier.id)?.terminals).toEqual([])
  })

  it('single-dispatches unknown create and suppresses stale delayed completion', async () => {
    const unknown = createDay5Simulator('UNKNOWN_AFTER_DISPATCH')
    const create = createCashierCreateController({ currentScope: unknown.getCurrentScope,
      canCreate: () => unknown.has('cashier.create'), currentTerminalOptions: () => unknown.terminalOptions(),
      port: () => unknown.ports.create, invalidateConfirmed: async () => undefined })
    const draft = { fullname: 'D5 Synthetic Cashier', phone: '998901000099', terminalIds: [unknown.terminalOptions()[0].id] }
    expect((await create.submit(draft)).kind).toBe('unknown')
    expect((await create.submit(draft)).kind).toBe('not-sent')
    expect(unknown.getSnapshot().counters.create).toBe(1)

    const delayed = createDay5Simulator('SCOPE_CHANGED')
    const pendingController = createCashierCreateController({ currentScope: delayed.getCurrentScope,
      canCreate: () => delayed.has('cashier.create'), currentTerminalOptions: () => delayed.terminalOptions(),
      port: () => delayed.ports.create, invalidateConfirmed: async () => undefined })
    const pending = pendingController.submit({ ...draft, terminalIds: [delayed.terminalOptions()[0].id] })
    await delayed.whenMutationDispatched()
    delayed.replaceSession()
    delayed.releaseMutation()
    expect((await pending).kind).toBe('stale')
    expect(delayed.getSnapshot().counters.create).toBe(1)
  })

  it('keeps a rapid double unassign at one DELETE and revocation suppresses late confirmation', async () => {
    const demo = createDay5Simulator('DELAYED_DOUBLE_SUBMIT')
    const page = await demo.api.cashierList({ search: '', page: 0, size: 10 }, signal)
    const cashier = page.content[0]
    const target = { cashier, terminal: cashier.terminals[0] }
    const controller = createUnassignTerminalController({ currentScope: demo.getCurrentScope,
      currentTarget: () => target, canUnassign: () => demo.has('cashier.unassignTerminal'),
      port: () => demo.ports.unassign, invalidateConfirmed: async () => undefined })
    controller.armConfirmation()
    const first = controller.submit()
    const second = controller.submit()
    await demo.whenMutationDispatched()
    expect(demo.getSnapshot().counters.unassign).toBe(1)
    demo.releaseMutation()
    expect((await first).kind).toBe('confirmed')
    expect((await second).kind).toBe('not-sent')

    const revoked = createDay5Simulator('PERMISSION_REVOKED')
    const currentPage = await revoked.api.cashierList({ search: '', page: 0, size: 10 }, signal)
    const row = currentPage.content[0]
    const selected = { cashier: row, terminal: row.terminals[0] }
    let invalidations = 0
    const pendingController = createUnassignTerminalController({ currentScope: revoked.getCurrentScope,
      currentTarget: () => selected, canUnassign: () => revoked.has('cashier.unassignTerminal'),
      port: () => revoked.ports.unassign, invalidateConfirmed: async () => { invalidations++ } })
    pendingController.armConfirmation()
    const pending = pendingController.submit()
    await revoked.whenMutationDispatched()
    revoked.revokePermission('UNASSIGN_TERMINAL')
    revoked.releaseMutation()
    expect((await pending).kind).toBe('stale')
    expect(revoked.getSnapshot().counters.unassign).toBe(1)
    expect(invalidations).toBe(0)
  })

  it('labels duplicate-phone rejection synthetic without recording a successful create', async () => {
    const demo = createDay5Simulator('DUPLICATE_PHONE')
    const controller = createCashierCreateController({ currentScope: demo.getCurrentScope,
      canCreate: () => demo.has('cashier.create'), currentTerminalOptions: () => demo.terminalOptions(),
      port: () => demo.ports.create, invalidateConfirmed: async () => undefined })
    const result = await controller.submit({ fullname: 'D5-MGMT-DEMO Duplicate',
      phone: '998901000001', terminalIds: [demo.terminalOptions()[0].id] })
    expect(result.kind).toBe('rejected')
    expect(demo.getSnapshot().counters.create).toBe(1)
    const page = await demo.api.cashierList({ search: 'Duplicate', page: 0, size: 10 }, signal)
    expect(page.totalElements).toBe(0)
  })

  it('keeps confirmed unassign distinct from a synthetic failed cashier refetch', async () => {
    const demo = createDay5Simulator('CONFIRMED_REFETCH_FAILED')
    const page = await demo.api.cashierList({ search: '', page: 0, size: 10 }, signal)
    const cashier = page.content[0]
    const target = { cashier, terminal: cashier.terminals[0] }
    const controller = createUnassignTerminalController({ currentScope: demo.getCurrentScope,
      currentTarget: () => target,
      canUnassign: () => demo.has('cashier.unassignTerminal'), port: () => demo.ports.unassign,
      invalidateConfirmed: async () => { await demo.api.cashierList({ search: '', page: 0, size: 10 }, signal) },
    })
    controller.armConfirmation()
    expect((await controller.submit()).kind).toBe('confirmed')
    expect(controller.getState().outcome.kind).toBe('confirmed')
  })
})
