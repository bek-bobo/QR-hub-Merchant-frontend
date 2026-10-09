import type { ReactNode } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { describe, expect, it, vi } from 'vitest'
import { CreateCashierDialog } from './CreateCashierDialog'
import dialogSource from './CreateCashierDialog.tsx?raw'
import pageSource from './CashierPage.tsx?raw'

const capture = vi.hoisted(() => ({ confirmed: null as (() => void) | null }))
vi.mock('./CreateCashierContent', () => ({ CreateCashierContent: ({ onConfirmed }: { onConfirmed: () => void }) => {
  capture.confirmed = onConfirmed
  return <form>shared-cashier-form</form>
} }))
vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  const part = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { ...actual, Dialog: { ...actual.Dialog,
    Root: part, Portal: part, Overlay: part, Content: part, Title: part, Description: part, Close: part,
  } }
})

describe('cashier creation dialog composition', () => {
  it('renders shared content and closes on its confirmed callback', () => {
    const close = vi.fn()
    const html = renderToStaticMarkup(<CreateCashierDialog onClose={close} />)
    expect(html).toContain('Yangi kassir')
    expect(html).toContain('shared-cashier-form')
    expect(close).not.toHaveBeenCalled()
    capture.confirmed?.()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('uses the authorized toolbar action, scope isolation and pending dismissal guards', () => {
    expect(pageSource).toContain("can(access, 'cashier.create', false)")
    expect(pageSource).toContain('onClick={() => setCreateScope(runtime.getCurrentScope())}')
    expect(pageSource).toContain('createOpen ? <CreateCashierDialog')
    expect(dialogSource).toContain('if (!open && !pending) onClose()')
    expect(dialogSource).toContain('disabled={pending}')
    expect(dialogSource).toContain('if (pending) event.preventDefault()')
    expect(dialogSource).not.toContain('CreateCashierPage')
  })
})
