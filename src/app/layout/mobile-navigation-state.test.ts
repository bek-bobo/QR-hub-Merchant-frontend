import { describe, expect, it } from 'vitest'
import { reduceMobileNavigationOpen } from './mobile-navigation-state'

describe('mobile navigation state', () => {
  it('opens and handles every controlled dismiss request', () => {
    expect(reduceMobileNavigationOpen(false, { type: 'set', open: true })).toBe(true)
    expect(reduceMobileNavigationOpen(true, { type: 'set', open: false })).toBe(false)
  })

  it('closes when a route is selected', () => {
    expect(reduceMobileNavigationOpen(true, { type: 'route-selected' })).toBe(false)
    expect(reduceMobileNavigationOpen(false, { type: 'route-selected' })).toBe(false)
  })
})
