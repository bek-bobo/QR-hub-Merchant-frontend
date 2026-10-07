// @vitest-environment happy-dom
import { act, StrictMode, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from 'radix-ui'
import { chooseSelectOption, openSelect } from '@/test/select-interaction'
import { FormField } from '@/components/forms/FormField'
import { Select } from './select'
import { PaginationBar } from '@/shared/ui/PaginationBar'

const mounted: { host: HTMLElement; root: Root }[] = []
let errors: unknown[][]

beforeEach(() => {
  errors = []
  const originalError = console.error
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(args)
    originalError(...args)
  })
})
afterEach(async () => {
  for (const { host, root } of mounted.splice(0)) {
    await act(async () => root.unmount())
    host.remove()
  }
  vi.restoreAllMocks()
  expect(errors.filter(([message]) => String(message).includes('Invalid prop') &&
    String(message).includes('React.Fragment'))).toEqual([])
})

async function mount(children: ReactNode) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  mounted.push({ host, root })
  await act(async () => root.render(children))
  const trigger = () => document.querySelector<HTMLButtonElement>('[role="combobox"]')!
  return { host, root, trigger }
}

describe('shared Radix Select', () => {
  it('changes pagination page size through the compact popup without changing the page callback', async () => {
    const onPageChange = vi.fn()
    const onPageSizeChange = vi.fn()
    const h = await mount(<PaginationBar ariaLabel="Natija sahifalari" currentPage={0}
      totalPages={10} totalItems={100} pageSize={10}
      onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />)
    expect(h.trigger().getAttribute('aria-label')).toBe('Sahifadagi yozuvlar soni')
    expect(h.trigger().dataset.size).toBe('compact')
    await chooseSelectOption(h.trigger(), '25')
    expect(onPageSizeChange).toHaveBeenCalledWith(25)
    expect(onPageChange).not.toHaveBeenCalled()
  })
  it('preserves exact IDs, optional clearing and controlled callbacks through keyboard selection', async () => {
    const change = vi.fn()
    function Owner() {
      const [value, setValue] = useState('')
      return <Select aria-label="Terminal" value={value} onChange={(event) => {
        change(event.target.value)
        setValue(event.target.value)
      }}>
        <option value="">Barcha terminallar</option>
        <option value="option:">A real ID resembling the internal encoding</option>
        <option value="0">Zero ID</option>
      </Select>
    }
    const h = await mount(<Owner />)
    await chooseSelectOption(h.trigger(), 'option:')
    expect(h.trigger().textContent).toContain('A real ID')
    await chooseSelectOption(h.trigger(), '0')
    expect(h.trigger().textContent).toContain('Zero ID')
    await chooseSelectOption(h.trigger(), '')
    expect(h.trigger().textContent).toContain('Barcha terminallar')
    expect(change.mock.calls).toEqual([['option:'], ['0'], ['']])
    expect(h.trigger().getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps a disabled placeholder non-selectable and skips disabled items with arrow navigation', async () => {
    const change = vi.fn()
    const h = await mount(<Select defaultValue="a" aria-label="Terminal" onChange={change}>
      <option value="" disabled>Terminalni tanlang</option>
      <option value="a">Terminal A</option>
      <option value="blocked" disabled>Unavailable terminal</option>
      <option value="b">Terminal B</option>
    </Select>)
    await openSelect(h.trigger())
    expect(document.querySelector('[data-value=""]')?.getAttribute('aria-disabled')).toBe('true')
    const first = document.querySelector<HTMLElement>('[role="option"][data-value="a"]')!
    await act(async () => {
      first.focus()
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect((document.activeElement as HTMLElement).dataset.value).toBe('b')
    await act(async () => document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
    ))
    expect(change).toHaveBeenCalledWith({ target: { value: 'b' }, currentTarget: { value: 'b' } })
    expect(h.trigger().textContent).toContain('Terminal B')
  })

  it('keeps form labels, validation descriptions and unavailable state on the visible trigger', async () => {
    const h = await mount(<FormField id="terminal" label="Terminal" errorText="Tanlang">
      {(props) => <Select {...props} value="" disabled required>
        <option value="" disabled>Yuklanmoqda...</option>
      </Select>}
    </FormField>)
    expect(h.trigger().id).toBe('terminal')
    expect(h.host.querySelector('label')?.htmlFor).toBe('terminal')
    expect(h.trigger().disabled).toBe(true)
    expect(h.trigger().getAttribute('aria-invalid')).toBe('true')
    expect(h.trigger().getAttribute('aria-describedby')).toBe('terminal-error')
    expect(h.trigger().getAttribute('aria-required')).toBe('true')
    expect(h.trigger().textContent).toContain('Yuklanmoqda...')
    await openSelect(h.trigger())
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })

  it('submits original values, rejects required empty values and resets an uncontrolled selection', async () => {
    const h = await mount(<form>
      <Select name="terminalId" required defaultValue="" aria-label="Terminal">
        <option value="">Terminalni tanlang</option>
        <option value="terminal-A">Terminal A</option>
      </Select>
    </form>)
    const form = h.host.querySelector('form')!
    expect(new FormData(form).get('terminalId')).toBe('')
    expect(form.checkValidity()).toBe(false)
    await chooseSelectOption(h.trigger(), 'terminal-A')
    expect(new FormData(form).get('terminalId')).toBe('terminal-A')
    expect(form.checkValidity()).toBe(true)
    await act(async () => form.reset())
    expect(h.trigger().textContent).toContain('Terminalni tanlang')
    expect(new FormData(form).get('terminalId')).toBe('')
  })

  it.each([false, true])('portals outside an overflowing dialog and restores trigger focus after Escape (StrictMode=%s)', async (strict) => {
    const dialog = <Dialog.Root defaultOpen>
      <Dialog.Portal><Dialog.Overlay /><Dialog.Content style={{ overflow: 'hidden' }}>
        <Dialog.Title>Create QR</Dialog.Title><Dialog.Description>Choose a terminal</Dialog.Description>
        <Select aria-label="Terminal" defaultValue="a" size="compact">
          <option value="a">Terminal A</option><option value="b">Terminal B</option>
        </Select>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    const h = await mount(strict ? <StrictMode>{dialog}</StrictMode> : dialog)
    await openSelect(h.trigger())
    const popup = document.querySelector<HTMLElement>('[role="listbox"]')!
    expect(popup).not.toBeNull()
    expect(popup.closest('[role="dialog"]')).toBeNull()
    expect(h.trigger().dataset.size).toBe('compact')
    await act(async () => {
      popup.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    })
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    // Radix schedules FocusScope's unmount autofocus after React commits the close.
    await vi.waitFor(() => expect(document.activeElement).toBe(h.trigger()))
  })
})
