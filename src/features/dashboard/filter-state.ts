import type { DashboardFilters, DashboardGranularity, DateRange } from '@/shared/contracts/merchant-read'
import { applyDashboardFilters } from './presenters'

export interface DashboardFilterState {
  readonly dateDraft: DateRange
  readonly terminalDraft?: string
  readonly applied: DashboardFilters
  readonly validationMessage: 'invalidRange' | null
  readonly requestedGranularity: DashboardGranularity
}

export type DashboardFilterAction =
  | { readonly type: 'granularity'; readonly granularity: DashboardGranularity }
  | { readonly type: 'date-draft'; readonly range: DateRange }
  | { readonly type: 'terminal-draft'; readonly terminalId?: string }
  | { readonly type: 'terminal-drawer'; readonly open: boolean }
  | { readonly type: 'commit-dates'; readonly range: DateRange }
  | { readonly type: 'apply-terminal' }
  | { readonly type: 'reset'; readonly filters: DashboardFilters }

export function createDashboardFilterState(filters: DashboardFilters): DashboardFilterState {
  return {
    dateDraft: { fromDate: filters.fromDate, toDate: filters.toDate },
    terminalDraft: filters.terminalId,
    applied: filters,
    validationMessage: null,
    requestedGranularity: 'AUTO',
  }
}

export function dashboardFilterReducer(
  state: DashboardFilterState,
  action: DashboardFilterAction,
): DashboardFilterState {
  switch (action.type) {
    case 'granularity':
      return { ...state, requestedGranularity: action.granularity }
    case 'date-draft':
      return { ...state, dateDraft: action.range, validationMessage: null }
    case 'terminal-draft':
      return { ...state, terminalDraft: action.terminalId }
    case 'terminal-drawer':
      // Both opening and dismissal discard any abandoned terminal edit.
      return state.terminalDraft === state.applied.terminalId
        ? state
        : { ...state, terminalDraft: state.applied.terminalId }
    case 'commit-dates':
      try {
        const applied = applyDashboardFilters({
          ...action.range,
          terminalId: state.applied.terminalId,
        })
        const datesChanged = applied.fromDate !== state.applied.fromDate || applied.toDate !== state.applied.toDate
        return { ...state, dateDraft: action.range, applied, requestedGranularity: datesChanged ? 'AUTO' : state.requestedGranularity,
          terminalDraft: applied.terminalId, validationMessage: null }
      } catch {
        return { ...state, dateDraft: action.range, validationMessage: 'invalidRange' }
      }
    case 'apply-terminal': {
      const terminalId = state.terminalDraft?.trim() || undefined
      if (terminalId === state.applied.terminalId) return state
      return { ...state, terminalDraft: terminalId,
        applied: applyDashboardFilters({ ...state.applied, terminalId }) }
    }
    case 'reset':
      return { ...createDashboardFilterState(action.filters), requestedGranularity:
        action.filters.fromDate === state.applied.fromDate && action.filters.toDate === state.applied.toDate ? state.requestedGranularity : 'AUTO' }
  }
}
