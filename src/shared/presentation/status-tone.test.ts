import { describe, expect, it } from 'vitest'
import { STATUS_TONES, statusToneClasses } from './status-tone'

describe('semantic status tones', () => {
  it('provides badge, indicator, and icon presentation for every approved role', () => {
    expect(STATUS_TONES).toEqual([
      'success',
      'warning',
      'info',
      'error',
      'neutral',
    ])

    for (const tone of STATUS_TONES) {
      expect(statusToneClasses[tone]).toEqual({
        badge: expect.any(String),
        indicator: expect.any(String),
        icon: expect.any(String),
      })
    }
  })
})
