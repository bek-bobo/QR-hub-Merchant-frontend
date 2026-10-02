import { describe, expect, it } from 'vitest'
import { resolveLookupSelectState } from './lookup-select-state'

describe('lookup select presentation state', () => {
  const ready = { enabled: true, pending: false, error: false, ids: ['1'] }
  it('distinguishes loading, options, empty, error and unavailable', () => {
    expect(resolveLookupSelectState({ ...ready, pending: true, ids: undefined })).toBe('loading')
    expect(resolveLookupSelectState(ready)).toBe('ready')
    expect(resolveLookupSelectState({ ...ready, ids: [] })).toBe('empty')
    expect(resolveLookupSelectState({ ...ready, error: true, ids: [] })).toBe('error')
    expect(resolveLookupSelectState({ ...ready, enabled: false, pending: true, ids: undefined })).toBe('unavailable')
  })
  it('never treats an unconfirmed or failed response as empty', () => {
    expect(resolveLookupSelectState({ ...ready, ids: undefined })).toBe('loading')
    expect(resolveLookupSelectState({ ...ready, pending: true, ids: [] })).toBe('loading')
    expect(resolveLookupSelectState({ ...ready, error: true })).toBe('error')
  })
})
