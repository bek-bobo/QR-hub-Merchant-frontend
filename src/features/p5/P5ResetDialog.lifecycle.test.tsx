// @vitest-environment happy-dom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { P5ResetDialog } from './P5ResetDialog'
import type { P5ResetState } from './p5-reset'

const mounted: { root: Root; host: HTMLElement }[] = []
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) {
    await act(async () => root.unmount()); host.remove()
  }
})

async function setup() {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const cancel = vi.fn(), confirm = vi.fn()
  function Owner() {
    const [open, setOpen] = useState(false)
    const [pending, setPending] = useState(false)
    const state: P5ResetState = { dialogOpen: open, refresh: 'idle',
      intent: { deviceId: 'X', description: 'Front desk', terminalName: 'Terminal',
        scope: { source: 'live', sessionScopeId: 'f07', accessRevision: 1 } },
      outcome: pending ? { kind: 'pending' } : { kind: 'idle' } }
    return <><button onClick={() => setOpen(true)}>Open reset</button>
      <P5ResetDialog state={state} onCancel={() => { cancel(); setOpen(false) }}
        onConfirm={() => { confirm(); setPending(true) }} onAcknowledgeUnknown={() => undefined} /></>
  }
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host); mounted.push({ root, host })
  await act(async () => root.render(<Owner />))
  await act(async () => host.querySelector('button')!.click())
  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!
  const escape = async () => { await act(async () => dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))) }
  return { host, dialog, escape, cancel, confirm }
}

describe('F07 real P5 destructive dialog', () => {
  it('mounts a named portal, focuses usable content and permits Escape before dispatch', async () => {
    const h = await setup()
    expect(h.host.contains(h.dialog())).toBe(false)
    expect(document.getElementById(h.dialog().getAttribute('aria-labelledby')!)?.textContent).toBe('PINni tiklash')
    expect(h.dialog().contains(document.activeElement)).toBe(true)
    expect(h.dialog().querySelector<HTMLButtonElement>('button[aria-label="Yopish"]')!.disabled).toBe(false)
    await h.escape()
    expect(h.cancel).toHaveBeenCalledTimes(1)
    expect(h.dialog()).toBeNull()
    expect(h.confirm).not.toHaveBeenCalled()
  })

  it('blocks Escape, close and repeated confirmation while the destructive request is pending', async () => {
    const h = await setup()
    const confirm = Array.from(h.dialog().querySelectorAll('button')).find((button) => button.textContent === 'PINni tiklash')!
    await act(async () => confirm.click())
    expect(h.confirm).toHaveBeenCalledTimes(1)
    expect(h.dialog().querySelector('[role="status"]')?.textContent).toContain('yuborilmoqda')
    await h.escape()
    await act(async () => {
      h.dialog().querySelector<HTMLButtonElement>('button[aria-label="Yopish"]')!.click()
      for (const button of h.dialog().querySelectorAll('button:disabled')) (button as HTMLButtonElement).click()
    })
    expect(h.dialog()).not.toBeNull()
    expect(h.cancel).not.toHaveBeenCalled()
    expect(h.confirm).toHaveBeenCalledTimes(1)
  })
})
