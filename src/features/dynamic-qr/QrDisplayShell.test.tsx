import { captureWithLocale } from '@/test/locale-fixture'
import { Children, isValidElement, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { describe, expect, it, vi } from 'vitest'
import { decodeDynamicQrPageResponse } from './contract'
import { decodeStaticQrPage } from '@/features/static-qr/contract'
import { StaticQrDisplayDialog } from '@/features/static-qr/StaticQrDisplayDialog'
import { QrDisplayDialog } from './QrDisplayDialog'
import { QrDisplayShell } from './QrDisplayShell'

vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  const part = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { ...actual, Dialog: { ...actual.Dialog, Root: part, Portal: part, Overlay: part,
    Content: part, Title: part, Description: part,
    Close: ({ children }: { children?: ReactNode }) => <div data-dialog-close>{children}</div> } }
})
vi.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value }: { value: string }) => <canvas data-payload={value} />,
  QRCodeSVG: ({ value }: { value: string }) => <svg data-payload={value} />,
}))

const link = 'https://qrhub.uz/Exact%2f?Case=YES&signature=a%2Bb#Fragment'
const page = { totalElements: 1, totalPages: 1, page: 0, size: 10 }
const dynamic = decodeDynamicQrPageResponse({ success: true, data: { ...page, content: [{
  pkey: 'dynamic-qr-id', terminalName: 'Dynamic terminal', merchantName: 'Merchant A', rrn: null, amount: 500000,
  statusCode: 5, createdAt: '2026-10-01T10:15:20', link,
}] } }).content[0]!
const staticQr = decodeStaticQrPage({ success: true, data: { ...page, content: [{
  id: 'static-qr-id', terminalName: 'Static terminal', merchantName: 'Merchant A', status: 0, link,
}] } }).content[0]!

function countClosePrimitives(node: ReactNode): number {
  return Children.toArray(node).reduce<number>((count, child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return count
    return count + (child.type === Dialog.Close ? 1 : 0) + countClosePrimitives(child.props.children)
  }, 0)
}

describe('standardized QR display dialogs', () => {
  it.each([
    { kind: 'dynamic', dialog: captureWithLocale(() => QrDisplayDialog({ row: dynamic, onOpenChange: vi.fn() })),
      id: dynamic.pkey, terminal: dynamic.terminalName, status: 'Muddati o‘tgan', tone: 'error' },
    { kind: 'static', dialog: captureWithLocale(() => StaticQrDisplayDialog({ row: staticQr, onOpenChange: vi.fn() })),
      id: staticQr.id, terminal: staticQr.terminalName, status: 'Faol', tone: 'success' },
  ])('shares the reference composition with actual $kind metadata and payload', ({ dialog, id, terminal, status, tone }) => {
    expect(dialog?.type).toBe(QrDisplayShell)
    const html = renderToStaticMarkup(dialog)
    for (const text of ['QR ko‘rsatish', 'To‘lov uchun QR ma’lumotlari', 'QR ma’lumotlari',
      'Kanonik havola', 'PDF yuklab olish', 'PNG yuklab olish', 'QRHUB to‘lov plakati', id, terminal, status]) {
      expect(html).toContain(text)
    }
    expect(html).toContain(`text-status-${tone}-foreground`)
    expect(html).toContain(`data-payload="${link.replaceAll('&', '&amp;')}"`)
    expect(html).toContain('aria-label="QR ID nusxalash"')
    expect(html.match(/data-dialog-close/g)).toHaveLength(1)
    expect(html).not.toMatch(/>Yopish<\/button>/)
    expect(html).toContain('aria-label="Yopish"')
    expect(html).not.toContain('<footer')
  })

  it('delegates dismissal to Radix with only the X close control and the existing callback', () => {
    const onOpenChange = vi.fn()
    const shell = captureWithLocale(() => QrDisplayShell({ children: <p>QR body</p>, onOpenChange }))
    expect(shell.type).toBe(Dialog.Root)
    expect(shell.props.open).toBe(true)
    expect(shell.props.onOpenChange).toBe(onOpenChange)
    expect(countClosePrimitives(shell)).toBe(1)
    shell.props.onOpenChange(false)
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('does not fabricate amount metadata for Static QR or render closed rows', () => {
    const html = renderToStaticMarkup(<StaticQrDisplayDialog row={staticQr} onOpenChange={vi.fn()} />)
    expect(html).not.toContain('Summa')
    expect(captureWithLocale(() => QrDisplayDialog({ row: null, onOpenChange: vi.fn() }))).toBeNull()
    expect(captureWithLocale(() => StaticQrDisplayDialog({ row: null, onOpenChange: vi.fn() }))).toBeNull()
  })
})
