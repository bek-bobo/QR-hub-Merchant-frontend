import { describe, expect, it } from 'vitest'
import { getTashkentDatePreset } from '@/shared/filters/date-range'
import { createDashboardFilterState, dashboardFilterReducer } from './filter-state'
import { resetDashboardFilters } from './presenters'
import { deriveRecentQrFilters } from './queries'

const instant = new Date('2026-09-30T19:01:00Z')
const initial = { fromDate: '2026-09-25', toDate: '2026-10-01', terminalId: 'applied-terminal' }

describe('Dashboard independent filter drafts', () => {
  it('keeps date and terminal drafts out of the applied selection until their own Apply', () => {
    const start = createDashboardFilterState(initial)
    const dates = { fromDate: '2026-09-01', toDate: '2026-09-10' }
    const drafted = dashboardFilterReducer(
      dashboardFilterReducer(start, { type: 'date-draft', range: dates }),
      { type: 'terminal-draft', terminalId: 'draft-terminal' },
    )
    expect(drafted.applied).toBe(initial)
    const dateApplied = dashboardFilterReducer(drafted, { type: 'apply-dates' })
    expect(dateApplied.applied).toEqual({ ...dates, terminalId: 'applied-terminal' })
    expect(dateApplied.terminalDraft).toBe('draft-terminal')
    const terminalApplied = dashboardFilterReducer(dateApplied, { type: 'apply-terminal' })
    expect(terminalApplied.applied).toEqual({ ...dates, terminalId: 'draft-terminal' })
    expect(initial).toEqual({ fromDate: '2026-09-25', toDate: '2026-10-01', terminalId: 'applied-terminal' })
  })

  it.each([
    { fromDate: '', toDate: '2026-10-01' },
    { fromDate: '2026-10-01', toDate: '' },
    { fromDate: '2026-02-30', toDate: '2026-10-01' },
    { fromDate: 'invalid', toDate: '2026-10-01' },
    { fromDate: '2026-10-02', toDate: '2026-10-01' },
  ])('rejects invalid or incomplete date Apply: %j', (range) => {
    const drafted = dashboardFilterReducer(createDashboardFilterState(initial), { type: 'date-draft', range })
    const result = dashboardFilterReducer(drafted, { type: 'apply-dates' })
    expect(result.applied).toBe(initial)
    expect(result.dateDraft).toEqual(range)
    expect(result.validationMessage).toBe('Sana oralig‘ini to‘g‘ri kiriting.')
  })

  it('applies Terminal against applied dates while leaving an incomplete date draft untouched', () => {
    let state = createDashboardFilterState(initial)
    state = dashboardFilterReducer(state, { type: 'date-draft', range: { fromDate: '2026-10-01', toDate: '' } })
    state = dashboardFilterReducer(state, { type: 'terminal-draft', terminalId: '  next-terminal  ' })
    expect(state.applied).toBe(initial)
    state = dashboardFilterReducer(state, { type: 'apply-terminal' })
    expect(state.applied).toEqual({ ...initial, terminalId: 'next-terminal' })
    expect(state.dateDraft).toEqual({ fromDate: '2026-10-01', toDate: '' })
    state = dashboardFilterReducer(state, { type: 'terminal-draft', terminalId: undefined })
    state = dashboardFilterReducer(state, { type: 'apply-terminal' })
    expect(state.applied).toEqual({ fromDate: initial.fromDate, toDate: initial.toDate })
  })

  it.each([
    [1, '2026-10-01'], [7, '2026-09-25'], [30, '2026-09-02'],
  ] as const)('keeps the %s-day preset as a draft just after Tashkent midnight', (days, fromDate) => {
    let state = createDashboardFilterState(initial)
    state = dashboardFilterReducer(state, { type: 'date-draft', range: getTashkentDatePreset(days, instant) })
    expect(state.dateDraft).toEqual({ fromDate, toDate: '2026-10-01' })
    expect(state.applied).toBe(initial)
    state = dashboardFilterReducer(state, { type: 'apply-dates' })
    expect(state.applied).toEqual({ fromDate, toDate: '2026-10-01', terminalId: 'applied-terminal' })
  })

  it.each([
    [1, '2026-09-30'], [7, '2026-09-24'], [30, '2026-09-01'],
  ] as const)('keeps the %s-day preset on the previous Tashkent day before its midnight', (days, fromDate) => {
    expect(getTashkentDatePreset(days, new Date('2026-09-30T18:59:00Z')))
      .toEqual({ fromDate, toDate: '2026-09-30' })
  })

  it('initializes and fully resets to seven Tashkent days with no terminal and aligned recent filters', () => {
    const defaults = resetDashboardFilters(instant)
    expect(defaults).toEqual({ fromDate: '2026-09-25', toDate: '2026-10-01' })
    expect(createDashboardFilterState(defaults).applied).toEqual(defaults)
    const dirty = dashboardFilterReducer(createDashboardFilterState(initial), {
      type: 'date-draft', range: { fromDate: '2026-09-01', toDate: '' },
    })
    const result = dashboardFilterReducer(dirty, { type: 'reset', filters: defaults })
    expect(result).toEqual({ dateDraft: defaults, applied: defaults, terminalDraft: undefined, validationMessage: null })
    expect(deriveRecentQrFilters(result.applied)).toEqual({ ...defaults, search: '', status: undefined, page: 0, size: 10 })
  })
})
