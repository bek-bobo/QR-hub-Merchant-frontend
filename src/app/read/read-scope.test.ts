import { describe, expect, it } from 'vitest'
import { createAccessRevisionTracker } from './read-scope'

describe('read access revision', () => {
  it('changes only when effective permission content changes', () => {
    const tracker = createAccessRevisionTracker()

    expect(tracker.update([])).toBe(0)
    expect(tracker.update(['GET_DASHBOARD', 'GET_DYNAMIC_QRS'])).toBe(1)
    expect(tracker.update(['GET_DYNAMIC_QRS', 'GET_DASHBOARD'])).toBe(1)
    expect(tracker.update(['GET_DASHBOARD'])).toBe(2)
  })
})
