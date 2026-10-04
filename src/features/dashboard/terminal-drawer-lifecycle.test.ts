import { describe, expect, it } from 'vitest'
import { createFilterDrawerHandlers } from '@/shared/ui/filter-drawer-state'
import { createDashboardFilterState, dashboardFilterReducer, type DashboardFilterAction } from './filter-state'

const applied = { fromDate: '2026-09-01', toDate: '2026-09-30', terminalId: 'T1' }

function drawer() {
  let state = createDashboardFilterState(applied)
  let open = false
  const dispatch = (action: DashboardFilterAction) => { state = dashboardFilterReducer(state, action) }
  const handlers = createFilterDrawerHandlers({
    setOpen: (next) => { open = next },
    onOpenChange: (next) => dispatch({ type: 'terminal-drawer', open: next }),
    onApply: () => { dispatch({ type: 'apply-terminal' }); return true },
    onReset: () => dispatch({ type: 'terminal-draft', terminalId: undefined }),
  })
  return { handlers, dispatch, state: () => state, open: () => open }
}

describe('Dashboard terminal drawer lifecycle', () => {
  it('initializes on open and discards an unapplied edit on every dismissal/reopen', () => {
    const flow = drawer()
    flow.dispatch({ type: 'terminal-draft', terminalId: 'abandoned' })
    flow.handlers.setOpen(true)
    expect(flow.state().terminalDraft).toBe('T1')
    flow.dispatch({ type: 'terminal-draft', terminalId: 'T2' })
    expect(flow.state().applied).toBe(applied)
    flow.handlers.setOpen(false)
    expect(flow.open()).toBe(false)
    expect(flow.state().terminalDraft).toBe('T1')
    flow.handlers.setOpen(true)
    expect(flow.state().terminalDraft).toBe('T1')
  })

  it('commits only the terminal and closes; unchanged Apply preserves the exact filter identity', () => {
    const flow = drawer()
    flow.handlers.setOpen(true)
    const original = flow.state()
    flow.handlers.apply()
    expect(flow.open()).toBe(false)
    expect(flow.state()).toBe(original)
    expect(flow.state().applied).toBe(applied)
    flow.handlers.setOpen(true)
    flow.dispatch({ type: 'terminal-draft', terminalId: 'T2' })
    flow.handlers.apply()
    expect(flow.state().applied).toEqual({ ...applied, terminalId: 'T2' })
    expect(flow.open()).toBe(false)
    flow.handlers.setOpen(true)
    expect(flow.state().terminalDraft).toBe('T2')
  })

  it('resets only the draft and keeps the drawer open until Apply commits all terminals', () => {
    const flow = drawer()
    flow.handlers.setOpen(true)
    flow.handlers.reset()
    expect(flow.open()).toBe(true)
    expect(flow.state().terminalDraft).toBeUndefined()
    expect(flow.state().applied).toBe(applied)
    flow.handlers.apply()
    expect(flow.open()).toBe(false)
    expect(flow.state().applied).toEqual({ fromDate: applied.fromDate, toDate: applied.toDate })
  })

  it('discards a draft Reset when dismissed and restores the applied terminal on reopen', () => {
    const flow = drawer()
    flow.handlers.setOpen(true)
    flow.handlers.reset()
    flow.handlers.setOpen(false)
    expect(flow.state().applied).toBe(applied)
    flow.handlers.setOpen(true)
    expect(flow.state().terminalDraft).toBe('T1')
  })

  it('reconciles edited drafts after external applied dates or terminal change', () => {
    const flow = drawer()
    flow.handlers.setOpen(true)
    flow.dispatch({ type: 'terminal-draft', terminalId: 'T2' })
    const range = { fromDate: '2026-10-01', toDate: '2026-10-02' }
    flow.dispatch({ type: 'commit-dates', range })
    expect(flow.open()).toBe(true)
    expect(flow.state().applied).toEqual({ ...range, terminalId: 'T1' })
    expect(flow.state().terminalDraft).toBe('T1')
    flow.dispatch({ type: 'terminal-draft', terminalId: 'T2' })
    flow.dispatch({ type: 'reset', filters: { ...range, terminalId: 'T3' } })
    expect(flow.state().terminalDraft).toBe('T3')
    expect(flow.state().applied).toEqual({ ...range, terminalId: 'T3' })
  })

  it('keeps terminal edits intact for incomplete or rejected date inputs', () => {
    const flow = drawer()
    flow.handlers.setOpen(true)
    flow.dispatch({ type: 'terminal-draft', terminalId: 'T2' })
    const range = { fromDate: '2026-10-01', toDate: '' }
    flow.dispatch({ type: 'date-draft', range })
    flow.dispatch({ type: 'commit-dates', range })
    expect(flow.state().applied).toBe(applied)
    expect(flow.state().terminalDraft).toBe('T2')
  })
})
