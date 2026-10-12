import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Button } from '@/components/ui/button'
import { CanonicalLinkCard } from './CanonicalLinkCard'
import { QrDetailsCard } from './QrDetailsCard'
import { copyExactPresentedLink, copyExactQrText, presentQrLink } from './qr-presentation'
import { DetailsCopyField } from '@/shared/ui/DetailsDialog'

const capture = vi.hoisted(() => ({ buttons: [] as Array<ComponentProps<typeof Button>> }))
vi.mock('@/components/ui/button', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/button')>()
  return { ...actual, Button: (props: ComponentProps<typeof Button>) => {
    capture.buttons.push(props)
    return <actual.Button {...props} />
  } }
})
beforeEach(() => { capture.buttons = [] })
afterEach(() => { vi.unstubAllGlobals() })

describe('shared QR copy controls', () => {
  it('copies an exact details-field value without URL normalization', () => {
    const original = 'https://qrhub.uz/Exact%2f?Case=YES&signature=a%2Bb#Fragment'
    const writeText = vi.fn(async (_text: string) => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    renderToStaticMarkup(<DetailsCopyField value={original} />)
    expect(capture.buttons[0]!['aria-label']).toBe('Havolani nusxalash')
    capture.buttons[0]!.onClick?.({} as never)
    expect(writeText).toHaveBeenCalledExactlyOnceWith(original)
  })

  it('displays the original URL and copies it through the feature callback', () => {
    const original = 'https://qrhub.uz/Exact%2f?Case=YES&signature=a%2Bb#Fragment'
    const writer = vi.fn(async (_text: string) => undefined)
    const onCopy = vi.fn(() => copyExactPresentedLink(presentQrLink(original), writer))
    const html = renderToStaticMarkup(<CanonicalLinkCard original={original} onCopy={onCopy} />)
    expect(html).toContain(`title="${original.replaceAll('&', '&amp;')}"`)
    expect(html).toContain('aria-label="Kanonik havola"')
    expect(html).toContain('aria-label="Havolani nusxalash"')
    capture.buttons[0]!.onClick?.({} as never)
    expect(onCopy).toHaveBeenCalledOnce()
    expect(writer).toHaveBeenCalledExactlyOnceWith(original)
  })

  it('copies the actual QR ID with the shared clipboard writer', () => {
    const writeText = vi.fn(async (_text: string) => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    renderToStaticMarkup(<QrDetailsCard qrId="Opaque-%2f-ID" terminalName="Terminal A" />)
    expect(capture.buttons[0]!['aria-label']).toBe('QR ID nusxalash')
    capture.buttons[0]!.onClick?.({} as never)
    expect(writeText).toHaveBeenCalledExactlyOnceWith('Opaque-%2f-ID')
  })

  it('does not offer ID copy when no real ID is available', () => {
    renderToStaticMarkup(<QrDetailsCard qrId="—" terminalName="Terminal A" />)
    expect(capture.buttons).toHaveLength(0)
  })

  it('reports clipboard rejection without changing the original text', async () => {
    const writeText = vi.fn(async (_text: string) => { throw Error('denied') })
    expect(await copyExactQrText('Opaque-%2f-ID', writeText)).toBe('failed')
    expect(writeText).toHaveBeenCalledExactlyOnceWith('Opaque-%2f-ID')
  })
})
