// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from '@/test/locale-fixture'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocaleRuntime } from '@/shared/i18n/runtime'
import { createMessages } from '@/shared/i18n/messages'
import { InfoTooltip } from './InfoTooltip'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); vi.useRealTimers()
})
async function mount() {
  await act(async () => root.render(<div style={{ overflow: 'hidden', height: 20 }}>
    <InfoTooltip label="Statistics information" text="Statistics are not enabled here." />
  </div>))
  return host.querySelector('button')!
}
const content = () => document.querySelector('[data-slot=info-tooltip-content]')
describe('shared explanatory InfoTooltip', () => {
  it('opens on mouse hover, portals out of overflow and closes when the pointer leaves', async () => {
    const button = await mount()
    await act(async () => {
      button.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', bubbles: true }))
      await vi.advanceTimersByTimeAsync(201)
    })
    expect(content()?.textContent).toContain('Statistics are not enabled here.')
    expect(host.contains(content())).toBe(false)
    expect(content()?.className).toContain('z-[110]')
    await act(async () => {
      button.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse', clientX: 1, clientY: 1 }))
    })
    await act(async () => {
      document.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', bubbles: true, clientX: 10000, clientY: 10000 }))
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(content()).toBeNull()
  })

  it('opens on keyboard focus, describes the trigger and dismisses with Escape', async () => {
    const button = await mount()
    await act(async () => button.focus())
    expect(content()).not.toBeNull()
    const description = document.getElementById(button.getAttribute('aria-describedby')!)
    expect(description?.getAttribute('role')).toBe('tooltip')
    expect(description?.textContent).toContain('Statistics are not enabled here.')
    await act(async () => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    expect(content()).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('supports touch tap toggle and closes when focus moves away', async () => {
    const button = await mount()
    await act(async () => {
      button.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }))
      button.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }))
      button.click()
    })
    expect(content()).not.toBeNull()
    await act(async () => vi.advanceTimersByTimeAsync(0))
    await act(async () => {
      button.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }))
      button.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }))
      button.click()
    })
    expect(content()).toBeNull()
    await act(async () => { button.focus(); button.click() })
    expect(content()).not.toBeNull()
    await act(async () => button.blur())
    expect(content()).toBeNull()
  })

  it('dismisses a pinned explanation on an outside pointer interaction', async () => {
    const button = await mount()
    await act(async () => button.click())
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(content()).not.toBeNull()
    await act(async () => document.body.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true })))
    expect(content()).toBeNull()
  })

  it.each(['uz', 'ru', 'en'] as const)('renders safe localized explanations in %s', async (locale) => {
    const runtime = createLocaleRuntime(); await runtime.initialize(locale)
    const p = createMessages(runtime, 'dynamicQr')
    const label = p.message('stats.infoLabel', { statistic: p.message('stats.total') })
    await act(async () => root.render(<InfoTooltip label={label} text={p.message('stats.failedHelp')} />))
    const button = host.querySelector('button')!
    expect(button.getAttribute('aria-label')).toBe(label)
    await act(async () => button.focus())
    expect(content()?.textContent).toContain(p.message('stats.failedHelp'))
    expect(content()?.textContent).not.toMatch(/stack|https?:|token|Error:/i)
  })
})
