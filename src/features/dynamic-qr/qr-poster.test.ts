import { afterEach, describe, expect, it, vi } from 'vitest'
import { QR_POSTER } from './qr-poster'

afterEach(() => { vi.unstubAllGlobals() })

describe('admin QRHub poster composition', () => {
  it('retains the reference A4 proportions, QR frame, padding and bilingual copy', () => {
    expect(QR_POSTER).toMatchObject({ width: 620, height: 877, scale: 2, background: '#FA0A4B',
      frame: { x: 130, y: 196, size: 360, padding: 30, radius: 34 },
      logo: { width: 264, y: 738 } })
    expect(QR_POSTER.topLines).toEqual(['BU YERDA QR - KOD YORDAMIDA', "TO'LASHINGIZ MUMKIN"])
    expect(QR_POSTER.bottomLines).toEqual(['ЗДЕСЬ МОЖНО ОПЛАТИТЬ', 'С ПОМОЩЬЮ QR - КОДА'])
  })

  it('renders a 1240×1754 poster with the source QR and actual logo recolored white', async () => {
    vi.resetModules()
    const contexts: Array<Record<string, unknown>> = []
    const canvases: Array<Record<string, unknown>> = []
    const images: Array<{ src: string }> = []
    class BrandImage {
      naturalWidth = 560
      naturalHeight = 150
      onload?: () => void
      onerror?: () => void
      set src(value: string) {
        images.push({ src: value })
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', BrandImage)
    vi.stubGlobal('window', { setTimeout, clearTimeout })
    vi.stubGlobal('document', { createElement: () => {
      const context = { drawImage: vi.fn(), fillRect: vi.fn(), scale: vi.fn(), fillText: vi.fn(),
        beginPath: vi.fn(), arc: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), globalCompositeOperation: '', fillStyle: '' }
      const canvas = { width: 0, height: 0, getContext: () => context }
      contexts.push(context)
      canvases.push(canvas)
      return canvas
    } })
    const { renderQrPoster, QR_POSTER_LOGO_URL } = await import('./qr-poster')
    const qr = { width: 600, height: 600 } as HTMLCanvasElement
    const poster = await renderQrPoster(qr)
    expect(images).toEqual([{ src: QR_POSTER_LOGO_URL }])
    expect(QR_POSTER_LOGO_URL).toContain('qrhub-brand-logo.png')
    expect(contexts[0]).toMatchObject({ globalCompositeOperation: 'source-in', fillStyle: '#ffffff' })
    expect(poster).toMatchObject({ width: 1240, height: 1754 })
    expect(contexts[1]!.scale).toHaveBeenCalledWith(2, 2)
    expect(contexts[1]!.roundRect).toHaveBeenCalledWith(130, 196, 360, 360, 34)
    expect(contexts[1]!.drawImage).toHaveBeenNthCalledWith(1, qr, 160, 226, 300, 300)
    expect(contexts[1]!.drawImage).toHaveBeenNthCalledWith(2, canvases[0], 178, 738, 264, expect.any(Number))
    expect(contexts[1]!.fillText).toHaveBeenCalledWith(QR_POSTER.topLines[0], 310, 96)
    expect(contexts[1]!.fillText).toHaveBeenCalledWith(QR_POSTER.bottomLines[1], 310, 674)
  })
})
