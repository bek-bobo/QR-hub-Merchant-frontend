import { describe, expect, it, vi } from 'vitest'
import { applyThemeModeSelection } from './theme-mode-selection'

describe('applyThemeModeSelection', () => {
  it.each(['light', 'dark', 'system'] as const)(
    'selecting %s forwards the exact theme mode',
    (mode) => {
      const setMode = vi.fn()

      applyThemeModeSelection(mode, setMode)

      expect(setMode).toHaveBeenCalledOnce()
      expect(setMode).toHaveBeenCalledWith(mode)
    },
  )

  it('ignores an unsupported native select value', () => {
    const setMode = vi.fn()

    applyThemeModeSelection('automatic', setMode)

    expect(setMode).not.toHaveBeenCalled()
  })
})

