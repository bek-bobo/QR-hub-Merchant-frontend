import { describe, expect, it } from 'vitest'
import { resolveSafeReturnTo } from '@/app/safe-return-to'
import { createP5ResetController } from '@/features/p5/p5-reset'
import { resolveRuntimeMode } from '@/shared/config/runtime'
import type { P5Row } from '@/shared/contracts/p5-read'
import {
  createDay6ReadRuntime,
  createDay6Simulator,
  day6ScenarioNames,
} from './simulator'

const signal = new AbortController().signal
const filters = { search: '', page: 0, size: 10 as const }

function resetSubject(scenario: Parameters<typeof createDay6Simulator>[0]) {
  const simulator = createDay6Simulator(scenario)
  const row = simulator.visibleRows().find((item) => item.deviceStatus === 0)
  if (!row) throw new Error('Missing eligible synthetic row.')
  let invalidations = 0
  const controller = createP5ResetController({
    currentScope: simulator.getCurrentScope,
    canRead: () => simulator.has('p5.read'),
    canReset: () => simulator.has('p5.resetPin'),
    currentRow: (deviceId): P5Row | null =>
      simulator.visibleRows().find((item) => item.deviceId === deviceId) ?? null,
    port: () => simulator.actionAvailable ? simulator.resetPort : null,
    invalidateConfirmed: async () => {
      invalidations += 1
      await simulator.api.p5List(filters, signal)
    },
  })
  return {
    simulator,
    row,
    controller,
    get invalidations() { return invalidations },
  }
}

describe('D6-P5-DEMO-ONLY boundary and scenarios', () => {
  it('keeps the DEV route out of live return targets and demo mode production-safe', () => {
    expect(resolveSafeReturnTo('/devices')).toBe('/devices')
    expect(resolveSafeReturnTo('/dev/day6/devices')).toBe('/account')
    expect(resolveSafeReturnTo('/dev/day6/account')).toBe('/account')
    expect(resolveRuntimeMode('demo', false)).toBe('live')
    expect(day6ScenarioNames).toHaveLength(24)
    expect(day6ScenarioNames).toContain('ACTION_CONTRACT_BLOCKED')
  })

  it('keeps read, reset and lookup capabilities independent', () => {
    const readOnly = createDay6Simulator('READ_ONLY')
    expect(readOnly.has('p5.read')).toBe(true)
    expect(readOnly.has('p5.resetPin')).toBe(false)
    expect(readOnly.has('merchant.lookup')).toBe(false)
    expect(readOnly.has('terminal.lookup')).toBe(false)

    const resetOnly = createDay6Simulator('RESET_ONLY')
    const runtime = createDay6ReadRuntime(resetOnly)
    expect(resetOnly.has('p5.read')).toBe(false)
    expect(resetOnly.has('p5.resetPin')).toBe(true)
    expect(resetOnly.has('merchant.lookup')).toBe(false)
    expect(resetOnly.has('terminal.lookup')).toBe(false)
    expect(runtime.p5ListOptions(filters).enabled).toBe(false)
    expect(resetOnly.getSnapshot().counters.p5List).toBe(0)

    const denied = createDay6Simulator('LOOKUP_DENIED')
    expect(denied.has('p5.read')).toBe(true)
    expect(denied.has('merchant.lookup')).toBe(false)
    expect(denied.has('terminal.lookup')).toBe(false)
  })

  it('reconstructs pristine data, counters, scope and gates on a scenario switch', async () => {
    const previous = createDay6Simulator('TARGET_CHANGED', 1)
    await previous.api.p5List(filters, signal)
    previous.changeTarget()
    const next = createDay6Simulator('NORMAL', 2)
    expect(next.getSnapshot().counters).toEqual({
      p5List: 0,
      merchantLookup: 0,
      terminalLookup: 0,
      resetPin: 0,
    })
    expect(next.getCurrentScope().sessionScopeId).not.toBe(previous.getCurrentScope().sessionScopeId)
    expect(next.visibleRows().find((row) => row.deviceId.endsWith('001'))?.deviceStatus).toBe(0)
  })

  it('provides deterministic rich fixtures and independent counters', async () => {
    const simulator = createDay6Simulator('NORMAL')
    const page = await simulator.api.p5List(filters, signal)
    await simulator.api.merchantLookup(signal)
    await simulator.api.terminalsForMerchant('101', signal)
    expect(page.totalElements).toBe(12)
    expect(page.content.some((row) => row.deviceStatus === 0)).toBe(true)
    expect(simulator.visibleRows().some((row) => row.deviceStatus === 1)).toBe(true)
    expect(simulator.visibleRows().some((row) => row.deviceStatus === 777)).toBe(true)
    expect(simulator.visibleRows().some((row) => row.description === null)).toBe(true)
    expect(simulator.visibleRows().some((row) => row.deviceId.length === 20)).toBe(true)
    expect(simulator.visibleRows().every((row) => !row.createdAt.endsWith('Z'))).toBe(true)
    expect(simulator.getSnapshot().counters).toEqual({
      p5List: 1,
      merchantLookup: 1,
      terminalLookup: 1,
      resetPin: 0,
    })
    simulator.resetCounters()
    expect(simulator.getSnapshot().counters).toEqual({
      p5List: 0,
      merchantLookup: 0,
      terminalLookup: 0,
      resetPin: 0,
    })
    expect(simulator.visibleRows()).toHaveLength(12)
  })

  it('releases delayed reads manually without timers', async () => {
    const simulator = createDay6Simulator('DELAYED_READ')
    let settled = false
    const pending = simulator.api.p5List(filters, signal).then((value) => {
      settled = true
      return value
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(simulator.getSnapshot().counters.p5List).toBe(1)
    simulator.releaseRead()
    expect((await pending).totalElements).toBe(12)
  })

  it('rejects a delayed read that returns after its scope was replaced', async () => {
    const simulator = createDay6Simulator('DELAYED_READ')
    const runtime = createDay6ReadRuntime(simulator)
    const pending = runtime.api.p5List(filters, signal)
    await Promise.resolve()
    simulator.replaceSession()
    simulator.releaseRead()
    await expect(pending).rejects.toMatchObject({ name: 'StaleReadScopeError' })
    expect(simulator.getSnapshot().counters.p5List).toBe(1)
  })

  it('covers confirmed, synthetic rejection, unknown and malformed reset outcomes', async () => {
    for (const [scenario, expected] of [
      ['CONFIRMED', 'confirmed'],
      ['REJECTED_SYNTHETIC', 'rejected'],
      ['UNKNOWN_AFTER_DISPATCH', 'unknown'],
      ['MALFORMED_SUCCESS', 'unknown'],
    ] as const) {
      const subject = resetSubject(scenario)
      expect(subject.controller.request(subject.row)).toBe(true)
      expect((await subject.controller.confirm()).kind).toBe(expected)
      expect(subject.simulator.getSnapshot().counters.resetPin).toBe(1)
      if (expected === 'confirmed') expect(subject.invalidations).toBe(1)
    }
  })

  it('counts NORMAL once and keeps READ_ONLY, RESET_ONLY and unknown statuses at reset zero', async () => {
    const normal = resetSubject('NORMAL')
    normal.controller.request(normal.row)
    expect((await normal.controller.confirm()).kind).toBe('confirmed')
    expect(normal.simulator.getSnapshot().counters.resetPin).toBe(1)

    for (const scenario of ['READ_ONLY', 'RESET_ONLY'] as const) {
      const subject = resetSubject(scenario)
      expect(subject.controller.request(subject.row)).toBe(false)
      expect(subject.simulator.getSnapshot().counters.p5List).toBe(0)
      expect(subject.simulator.getSnapshot().counters.resetPin).toBe(0)
    }

    const unknown = createDay6Simulator('UNKNOWN_STATUS')
    expect((await unknown.api.p5List(filters, signal)).content.every((row) => row.deviceStatus === 777)).toBe(true)
    expect(unknown.visibleRows().some((row) => row.deviceStatus === 0)).toBe(false)
    expect(unknown.getSnapshot().counters.resetPin).toBe(0)
  })

  it('single-dispatches delayed double-submit and suppresses stale scope/permission completions', async () => {
    const double = resetSubject('DELAYED_DOUBLE_SUBMIT')
    double.controller.request(double.row)
    const first = double.controller.confirm()
    double.controller.dismiss()
    expect(double.controller.request(double.row)).toBe(true)
    const second = double.controller.confirm()
    await double.simulator.whenMutationDispatched()
    expect(double.simulator.getSnapshot().counters.resetPin).toBe(1)
    double.simulator.releaseMutation()
    expect((await first).kind).toBe('confirmed')
    expect((await second).kind).toBe('not-sent')

    for (const scenario of ['SCOPE_CHANGED', 'PERMISSION_REVOKED'] as const) {
      const subject = resetSubject(scenario)
      subject.controller.request(subject.row)
      const pending = subject.controller.confirm()
      await subject.simulator.whenMutationDispatched()
      if (scenario === 'SCOPE_CHANGED') subject.simulator.replaceSession()
      else subject.simulator.revokeResetPermission()
      subject.simulator.releaseMutation()
      expect((await pending).kind).toBe('stale')
      expect(subject.invalidations).toBe(0)
      expect(subject.simulator.getSnapshot().counters.resetPin).toBe(1)
    }
  })

  it('blocks changed targets and unavailable contracts before dispatch', async () => {
    const changed = resetSubject('TARGET_CHANGED')
    changed.controller.request(changed.row)
    changed.simulator.changeTarget()
    expect((await changed.controller.confirm()).kind).toBe('not-sent')
    expect(changed.simulator.getSnapshot().counters.resetPin).toBe(0)

    const blocked = resetSubject('ACTION_CONTRACT_BLOCKED')
    expect(blocked.controller.request(blocked.row)).toBe(false)
    expect(blocked.simulator.getSnapshot().counters.resetPin).toBe(0)
  })

  it('keeps confirmation when the current-scope refetch fails', async () => {
    const subject = resetSubject('CONFIRMED_REFETCH_FAILED')
    subject.controller.request(subject.row)
    expect((await subject.controller.confirm()).kind).toBe('confirmed')
    expect(subject.controller.getState().outcome.kind).toBe('confirmed')
    expect(subject.controller.getState().refresh).toBe('failed')
    expect(subject.invalidations).toBe(1)
  })

  it('does not replay an unknown dispatched reset after a read refresh', async () => {
    const subject = resetSubject('UNKNOWN_AFTER_DISPATCH')
    subject.controller.request(subject.row)
    expect((await subject.controller.confirm()).kind).toBe('unknown')
    await subject.simulator.api.p5List(filters, signal)
    expect(subject.controller.request(subject.row)).toBe(true)
    expect((await subject.controller.confirm()).kind).toBe('not-sent')
    expect(subject.simulator.getSnapshot().counters.resetPin).toBe(1)
  })

  it('models empty, contract, lookup and parent-loss paths without using global fetch', async () => {
    expect((await createDay6Simulator('EMPTY').api.p5List(filters, signal)).totalElements).toBe(0)
    await expect(createDay6Simulator('BAD_REQUIRED').api.p5List(filters, signal)).rejects.toMatchObject({ kind: 'contract' })

    const lookup = createDay6Simulator('LOOKUP_LOST')
    lookup.loseLookup()
    await expect(lookup.api.merchantLookup(signal)).rejects.toThrow('lookup lost')

    const parent = createDay6Simulator('PARENT_CHANGED')
    parent.changeParent()
    expect((await parent.api.merchantLookup(signal)).map((item) => item.id)).toEqual(['202'])

    const denied = createDay6Simulator('LOOKUP_DENIED')
    expect((await denied.api.p5List(filters, signal)).totalElements).toBe(12)
    expect(denied.getSnapshot().counters).toMatchObject({
      p5List: 1,
      merchantLookup: 0,
      terminalLookup: 0,
    })

    const blocked = createDay6Simulator('ACTION_CONTRACT_BLOCKED')
    expect((await blocked.api.p5List(filters, signal)).totalElements).toBe(12)
    expect(blocked.actionAvailable).toBe(false)
    expect(blocked.getSnapshot().counters.resetPin).toBe(0)
  })
})
