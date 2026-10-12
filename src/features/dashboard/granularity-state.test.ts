import { describe, expect, it } from 'vitest'
import { createDashboardFilterState, dashboardFilterReducer } from './filter-state'
import { readKeys } from '@/shared/api/read-keys'

const dates = { fromDate: '2026-09-01', toDate: '2026-09-30' }
describe('Atomic granularity state', () => {
  it('resets explicit granularity in the same transition as changed dates, preserving it for unchanged dates', () => {
    const selected = dashboardFilterReducer(createDashboardFilterState(dates), { type: 'granularity', granularity: 'WEEK' })
    expect(dashboardFilterReducer(selected, { type: 'commit-dates', range: dates }).requestedGranularity).toBe('WEEK')
    const changed = dashboardFilterReducer(selected, { type: 'commit-dates', range: { fromDate: '2026-09-30', toDate: '2026-09-30' } })
    expect(changed.requestedGranularity).toBe('AUTO')
    expect(changed.applied).toEqual({ fromDate: '2026-09-30', toDate: '2026-09-30' })
    expect(dashboardFilterReducer(selected, { type: 'reset', filters: dates }).requestedGranularity).toBe('WEEK')
    expect(dashboardFilterReducer(selected, { type: 'reset', filters: changed.applied }).requestedGranularity).toBe('AUTO')
  })
  it('preserves explicit granularity for terminal edits and maintains distinct query identities', () => {
    const selected = dashboardFilterReducer(createDashboardFilterState(dates), { type: 'granularity', granularity: 'WEEK' })
    const draft = dashboardFilterReducer(selected, { type: 'terminal-draft', terminalId: 'T1' })
    const applied = dashboardFilterReducer(draft, { type: 'apply-terminal' })
    expect(applied.requestedGranularity).toBe('WEEK')
    expect(applied.applied).toEqual({ ...dates, terminalId: 'T1' })
    const scope = { source: 'live' as const, sessionScopeId: 'session', accessRevision: 1 }
    const auto = readKeys.dashboard(scope, dates)
    expect(auto.at(-1)).toBe('AUTO')
    expect(readKeys.dashboard(scope, { ...dates, granularity: 'WEEK' })).not.toEqual(auto)
    expect(readKeys.dashboard(scope, { ...dates, granularity: 'DAY' })).not.toEqual(readKeys.dashboard(scope, { ...dates, granularity: 'WEEK' }))
  })
})
