import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { CreateQrContentProps } from './CreateQrContent'
import contentSource from './CreateQrContent.tsx?raw'
import dialogSource from './CreateQrDialog.tsx?raw'
import pageSource from './CreateQrPage.tsx?raw'
import { CreateQrDialog } from './CreateQrDialog'
import { CreateQrPage } from './CreateQrPage'

const capture = vi.hoisted(() => ({ props: null as CreateQrContentProps | null }))
vi.mock('./CreateQrContent', () => ({ CreateQrContent: (props: CreateQrContentProps) => {
  capture.props = props
  return <p>shared-create-content</p>
} }))
vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  const part = ({ children }: { children: ReactNode }) => <div>{children}</div>
  return { ...actual, Dialog: {
    ...actual.Dialog,
    Root: part, Portal: part, Overlay: part, Content: part,
    Title: part, Description: part, Close: part,
  } }
})

describe('shared Create QR composition', () => {
  it('renders the route through the shared implementation', () => {
    expect(renderToStaticMarkup(<CreateQrPage />)).toContain('shared-create-content')
    expect(capture.props?.embedded).toBeUndefined()
    expect(capture.props?.resetOnMount).toBeUndefined()
  })

  it('preserves embedded modal props and its close callback', () => {
    const changeOpen = vi.fn()
    expect(renderToStaticMarkup(<CreateQrDialog open onOpenChange={changeOpen} />)).toContain('shared-create-content')
    expect(capture.props?.embedded).toBe(true)
    expect(capture.props?.resetOnMount).toBe(true)
    expect(capture.props?.onPendingChange).toBeTypeOf('function')
    expect(capture.props?.onResultModeChange).toBeTypeOf('function')
    capture.props?.onClose?.()
    expect(changeOpen).toHaveBeenCalledWith(false)
  })

  it('has one shared create implementation and no dialog import of the route page', () => {
    expect(dialogSource).not.toContain("from './CreateQrPage'")
    expect(dialogSource).toContain("from './CreateQrContent'")
    expect(pageSource).toContain('<CreateQrContent {...props} />')
    expect(pageSource).not.toContain('createCreateQrController')
    expect(dialogSource).not.toContain('createCreateQrController')
    expect(contentSource).toContain('createCreateQrController({')
  })

  it('keeps amount examples and dynamic limits inside the associated help before the error', () => {
    const amountStart = contentSource.indexOf('<FormField id="create-qr-amount"')
    const amountEnd = contentSource.indexOf('</FormField>', amountStart)
    const amountField = contentSource.slice(amountStart, amountEnd)
    const terminalSection = contentSource.slice(contentSource.indexOf('<FormField id="create-qr-terminal"'), amountStart)

    expect(terminalSection).not.toContain('Ruxsatli oraliq:')
    expect(terminalSection).not.toContain('Ruxsat etilgan summa:')
    expect(amountField).toContain('label="Summa, UZS"')
    expect(amountField).toContain('helpText={<>')
    expect(amountField).toContain('Masalan: 12 500.50 yoki 12 500,50')
    expect(amountField).toContain('Ruxsat etilgan summa:')
    expect(amountField).toContain("formatMinorValue({ minorUnits: String(bounds.minimum), scale: 2 })")
    expect(amountField).toContain("formatMoney({ minorUnits: String(bounds.maximum), currency: 'UZS', scale: 2 })")
    expect(amountField.indexOf('Masalan:')).toBeLessThan(amountField.indexOf('Ruxsat etilgan summa:'))
    expect(amountField.indexOf('Ruxsat etilgan summa:')).toBeLessThan(amountField.indexOf('errorText='))
    expect(amountField).toContain('Summani ko‘rsatilgan format va ruxsat etilgan oraliqda kiriting.')
    expect(amountField).toContain('<MoneyInput {...controlProps}')
    expect(contentSource).not.toContain('Faqat raqam va bitta nuqta yoki vergul')
    expect(contentSource).not.toContain('Summa formati yoki oralig‘i noto‘g‘ri.')
  })
})
