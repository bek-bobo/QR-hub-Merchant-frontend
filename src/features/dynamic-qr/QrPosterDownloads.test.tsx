import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Button } from '@/components/ui/button'
import { QrPosterDownloads } from './QrPosterDownloads'

const capture = vi.hoisted(() => ({
  buttons: [] as Array<ComponentProps<typeof Button>>,
  pdf: vi.fn(), png: vi.fn(),
}))
vi.mock('./qr-poster-download', () => ({ downloadPosterPdf: capture.pdf, downloadPosterPng: capture.png }))
vi.mock('@/components/ui/button', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/button')>()
  return { ...actual, Button: (props: ComponentProps<typeof Button>) => {
    capture.buttons.push(props)
    return <actual.Button {...props} />
  } }
})
beforeEach(() => { capture.buttons = []; capture.pdf.mockReset(); capture.png.mockReset() })

describe('poster downloads', () => {
  it('renders both actions disabled while the matching poster is unavailable', () => {
    const html = renderToStaticMarkup(<QrPosterDownloads poster={null} qrId="qr-1" />)
    expect(html).toContain('PDF yuklab olish')
    expect(html).toContain('PNG yuklab olish')
    expect(capture.buttons.map((button) => button.disabled)).toEqual([true, true])
    for (const button of capture.buttons) button.onClick?.({} as never)
    expect(capture.pdf).not.toHaveBeenCalled()
    expect(capture.png).not.toHaveBeenCalled()
  })

  it.each(['pdf', 'png'] as const)('exports %s from the exact canvas used for preview', (format) => {
    const poster = { width: 1240, height: 1754 } as HTMLCanvasElement
    renderToStaticMarkup(<QrPosterDownloads poster={poster} qrId="qr-1" />)
    expect(capture.buttons.map((button) => button.disabled)).toEqual([false, false])
    capture.buttons[format === 'pdf' ? 0 : 1]!.onClick?.({} as never)
    expect(capture[format]).toHaveBeenCalledExactlyOnceWith(poster, `qrhub-qr-qr-1.${format}`)
    expect(capture[format === 'pdf' ? 'png' : 'pdf']).not.toHaveBeenCalled()
  })
})
