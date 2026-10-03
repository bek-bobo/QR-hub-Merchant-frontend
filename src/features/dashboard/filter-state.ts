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
  | { readonly type: 'apply-dates' }
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
    case 'apply-dates':
      try {
        const applied = applyDashboardFilters({
          ...state.dateDraft,
          terminalId: state.applied.terminalId,
        })
        return { ...state, applied, validationMessage: null }
      } catch {
        return { ...state, validationMessage: 'Sana oralig‘ini to‘g‘ri kiriting.' }
      }
    case 'apply-terminal':
      return {
        ...state,
        applied: applyDashboardFilters({ ...state.applied, terminalId: state.terminalDraft }),
      }
    case 'reset':
      return createDashboardFilterState(action.filters)
  }
}
