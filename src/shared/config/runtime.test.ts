import { describe, expect, it } from 'vitest'
import { resolveRuntimeMode } from './runtime'

describe('preview boundary', () => {
  it('requires explicit development preview', () => {
    expect(resolveRuntimeMode('demo', true)).toBe('demo')
    expect(resolveRuntimeMode(undefined, true)).toBe('live')
    expect(resolveRuntimeMode('typo', true)).toBe('live')
  })

  it('never enables preview in production', () => {
    expect(resolveRuntimeMode('demo', false)).toBe('live')
    expect(resolveRuntimeMode('live', false)).toBe('live')
  })
})
