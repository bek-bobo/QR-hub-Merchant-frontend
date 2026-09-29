import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FilterDrawer } from './FilterDrawer'
import { createFilterDrawerHandlers } from './filter-drawer-state'

function triggerTag(html: string): string {
  const match = html.match(/<button\b[^>]*>/)
  expect(match).not.toBeNull()
  return match?.[0] ?? ''
}

describe('FilterDrawer', () => {
  it('renders a closed Filtrlar trigger initially', () => {
    const html = renderToStaticMarkup(
      <FilterDrawer onApply={() => true} onReset={() => undefined}>
        <input defaultValue="saqlanadigan qiymat" />
      </FilterDrawer>,
    )

    const trigger = triggerTag(html)

    expect(trigger).toContain('aria-haspopup="dialog"')
    expect(trigger).toContain('aria-expanded="false"')
    expect(html).toContain('>Filtrlar</button>')
  })

  it('opens and closes without mutating draft data or applying it', () => {
    let draft = 'saqlanadigan qiymat'
    let applyCalls = 0
    const openStates: boolean[] = []
    const handlers = createFilterDrawerHandlers({
      setOpen: (open) => openStates.push(open),
      onApply: () => {
        applyCalls += 1
        return true
      },
      onReset: () => undefined,
    })

    handlers.setOpen(true)
    draft = 'o‘zgartirilgan qiymat'
    handlers.setOpen(false)

    expect(openStates).toEqual([true, false])
    expect(draft).toBe('o‘zgartirilgan qiymat')
    expect(applyCalls).toBe(0)
  })

  it('applies only through the explicit Apply action and closes on success', () => {
    let applyCalls = 0
    const openStates: boolean[] = []
    const handlers = createFilterDrawerHandlers({
      setOpen: (open) => openStates.push(open),
      onApply: () => {
        applyCalls += 1
        return true
      },
      onReset: () => undefined,
    })

    handlers.apply()

    expect(applyCalls).toBe(1)
    expect(openStates).toEqual([false])
  })

  it('keeps the drawer open when local Apply validation fails', () => {
    const openStates: boolean[] = []
    const handlers = createFilterDrawerHandlers({
      setOpen: (open) => openStates.push(open),
      onApply: () => false,
      onReset: () => undefined,
    })

    handlers.apply()

    expect(openStates).toEqual([])
  })

  it('delegates Reset without closing or applying', () => {
    let resetCalls = 0
    let applyCalls = 0
    const openStates: boolean[] = []
    const handlers = createFilterDrawerHandlers({
      setOpen: (open) => openStates.push(open),
      onApply: () => {
        applyCalls += 1
        return true
      },
      onReset: () => {
        resetCalls += 1
      },
    })

    handlers.reset()

    expect(resetCalls).toBe(1)
    expect(applyCalls).toBe(0)
    expect(openStates).toEqual([])
  })
})
