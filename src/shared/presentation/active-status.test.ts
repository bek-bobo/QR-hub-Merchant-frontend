import { describe, expect, it } from 'vitest'
import { presentActiveStatus } from './active-status'

describe('active status presentation', () => {
  it('presents confirmed status zero as active without exposing the raw code', () => {
    expect(presentActiveStatus(0)).toEqual({ label: 'Faol', tone: 'success' })
  })

  it('falls back to a neutral unknown label for unconfirmed values', () => {
    expect(presentActiveStatus(777)).toEqual({ label: 'Noma’lum', tone: 'neutral' })
  })
})
