import { describe, expect, it } from 'vitest'
import { decodeCreateTerminalOptionsResponse, decodeTerminalOptionsResponse } from './terminal-lookup.contract'

describe('terminal lookup contract', () => {
  it('keeps only the verified ID and name fields', () => {
    expect(
      decodeTerminalOptionsResponse({
        success: true,
        data: [
          {
            id: '0123456789abcdef0123456789abcdef',
            name: 'Terminal A',
            minAmount: 100000,
            maxAmount: 2000000000,
          },
        ],
      }),
    ).toEqual([
      { id: '0123456789abcdef0123456789abcdef', name: 'Terminal A' },
    ])
  })

  it('rejects nullable or malformed option lists', () => {
    expect(() =>
      decodeTerminalOptionsResponse({ success: true, data: null }),
    ).toThrow()
    expect(() =>
      decodeTerminalOptionsResponse({
        success: true,
        data: [{ id: '', name: 'Terminal A' }],
      }),
    ).toThrow()
  })

  it('projects validated create limits without changing the read lookup', () => {
    const payload = { success: true, data: [{ id: 'a', name: 'A', minAmount: 100000, maxAmount: 2000000000 }] }
    expect(decodeCreateTerminalOptionsResponse(payload)).toEqual([
      { id: 'a', name: 'A', minAmountMinor: '100000', maxAmountMinor: '2000000000' },
    ])
    expect(() => decodeCreateTerminalOptionsResponse({ success: true, data: [
      { id: 'a', name: 'A', minAmount: 2000000001, maxAmount: 2000000000 },
    ] })).toThrow()
    expect(() => decodeCreateTerminalOptionsResponse({ success: true, data: [
      { id: 'a', name: 'A', minAmount: null, maxAmount: 2000000000 },
    ] })).toThrow()
  })
})
