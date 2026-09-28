import { describe, expect, it } from 'vitest'
import { presentCashierTerminalStatus } from './status-presentation'

describe('cashier terminal status presentation', () => {
  it('uses only source-confirmed assignment meanings', () => {
    expect(presentCashierTerminalStatus(0)).toEqual({ label: 'Faol', tone: 'success' })
    expect(presentCashierTerminalStatus(1)).toEqual({ label: 'Faol emas', tone: 'neutral' })
    expect(presentCashierTerminalStatus(777)).toEqual({ label: 'Noma’lum', tone: 'neutral' })
  })
})
