// @vitest-environment happy-dom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MoneyInput } from './MoneyInput'

const mounted: { root: Root; host: HTMLElement }[] = []
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) {
    await act(async () => root.unmount())
    host.remove()
  }
  vi.restoreAllMocks()
})

async function setup(initial = '') {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const changed = vi.fn()
  function Owner() {
    const [value, setValue] = useState(initial)
    return <><MoneyInput aria-label="Amount" value={value} onValueChange={(next) => {
      changed(next)
      setValue(next)
      // Model a controlled owner's selection change before React commits.
      document.querySelector<HTMLInputElement>('input')!.setSelectionRange(0, 0)
    }} /><button onClick={() => setValue('9 999')}>External value</button></>
  }
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host); mounted.push({ root, host })
  await act(async () => root.render(<Owner />))
  const input = host.querySelector('input')!
  const edit = async (value: string, caret: number) => {
    await act(async () => {
      // Bypass React's value tracker, as a browser edit does.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.setSelectionRange(caret, caret)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  return { host, input, changed, edit }
}

describe('F07 MoneyInput controlled DOM selection', () => {
  it.each([
    ['', '1000', 4, '1 000', 5],
    ['123 456', '1234 456', 4, '1 234 456', 5],
    ['1 000', '1000,25', 7, '1 000,25', 8],
  ] as const)('restores caret after controlled formatting of %s → %s', async (initial, raw, caret, formatted, expectedCaret) => {
    const h = await setup(initial)
    h.input.focus()
    await h.edit(raw, caret)
    expect(h.changed).toHaveBeenCalledExactlyOnceWith(formatted)
    expect(h.input.value).toBe(formatted)
    expect(h.input.selectionStart).toBe(expectedCaret)
    expect(h.input.selectionEnd).toBe(expectedCaret)
    expect(document.activeElement).toBe(h.input)
  })

  it('does not replay an old selection after focus moves and the owner changes value', async () => {
    const h = await setup()
    h.input.focus(); await h.edit('1000', 4)
    const button = h.host.querySelector('button')!
    button.focus()
    const selection = vi.spyOn(h.input, 'setSelectionRange')
    await act(async () => button.click())
    expect(h.input.value).toBe('9 999')
    expect(document.activeElement).toBe(button)
    expect(selection).not.toHaveBeenCalled()
  })
})
