import { describe, expect, it } from 'vitest'
import { reduceSidebarCollapsed } from './sidebar-collapse-state'

describe('desktop sidebar collapse state', () => {
  it('toggles between the expanded default and collapsed mode', () => {
    const collapsed = reduceSidebarCollapsed(false)
    expect(collapsed).toBe(true)
    expect(reduceSidebarCollapsed(collapsed)).toBe(false)
  })
})
