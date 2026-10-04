import type { DashboardFilters, DateRange } from '@/shared/contracts/merchant-read'
import { applyDashboardFilters } from './presenters'

export interface DashboardFilterState {
  readonly dateDraft: DateRange
  readonly terminalDraft?: string
  readonly applied: DashboardFilters
  readonly validationMessage: string | null
}

export type DashboardFilterAction =
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
  }
}

export function dashboardFilterReducer(
  state: DashboardFilterState,
  action: DashboardFilterAction,
): DashboardFilterState {
  switch (action.type) {
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
        return { ...state, dateDraft: action.range, applied,
          terminalDraft: applied.terminalId, validationMessage: null }
      } catch {
        return { ...state, dateDraft: action.range, validationMessage: 'Sana oralig‘ini to‘g‘ri kiriting.' }
      }
    case 'apply-terminal': {
      const terminalId = state.terminalDraft?.trim() || undefined
      if (terminalId === state.applied.terminalId) return state
      return { ...state, terminalDraft: terminalId,
        applied: applyDashboardFilters({ ...state.applied, terminalId }) }
    }
    case 'reset':
      return createDashboardFilterState(action.filters)
  }
}
