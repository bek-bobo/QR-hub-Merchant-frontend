import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPosterPdf, downloadPosterPdf, downloadPosterPng } from './qr-poster-download'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('poster file formats', () => {
  it('builds a single A4 image page with byte-accurate stream lengths and cross references', () => {
    const compressed = new Uint8Array([120, 156, 255, 0, 13, 10, 128])
    const pdf = createPosterPdf(compressed, 1240, 1754)
    const decoder = new TextDecoder()
    const text = decoder.decode(pdf)
    expect(text).toContain('/MediaBox [0 0 595.28 841.89]')
    expect(text).toContain('/Width 1240 /Height 1754 /ColorSpace /DeviceRGB')
    expect(text).toContain('/Filter /FlateDecode /Length 7')
    expect(text).toContain('/Count 1')
    const xrefOffset = Number(/startxref\n(\d+)/.exec(text)![1])
    const xref = decoder.decode(pdf.subarray(xrefOffset))
    expect(xref).toMatch(/^xref\n0 6\n/)
    const entries = [...xref.matchAll(/(\d{10}) 00000 n/g)]
    expect(entries).toHaveLength(5)
    entries.forEach((entry, index) => {
      expect(decoder.decode(pdf.subarray(Number(entry[1]), Number(entry[1]) + 7)))
        .toBe(`${index + 1} 0 obj`)
    })
    const streamStart = text.indexOf('stream\n') + 'stream\n'.length
    expect(pdf.slice(streamStart, streamStart + compressed.length)).toEqual(compressed)
  })

  it('downloads only the native poster PNG and removes the temporary link', () => {
    const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor), body: { appendChild: vi.fn() } })
    const canvas = { toDataURL: vi.fn(() => 'data:image/png;base64,poster') } as unknown as HTMLCanvasElement
    downloadPosterPng(canvas, 'qrhub.png')
    expect(canvas.toDataURL).toHaveBeenCalledExactlyOnceWith('image/png')
    expect(anchor).toMatchObject({ href: 'data:image/png;base64,poster', download: 'qrhub.png' })
    expect(anchor.click).toHaveBeenCalledOnce()
    expect(anchor.remove).toHaveBeenCalledOnce()
  })

  it('embeds lossless poster RGB in the PDF and releases its download URL', async () => {
    vi.useFakeTimers()
    const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild: vi.fn() } })
    vi.stubGlobal('window', { setTimeout })
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:poster')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const context = { getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([250, 10, 75, 255, 255, 255, 255, 255]) })) }
    const canvas = { width: 2, height: 1, getContext: () => context } as unknown as HTMLCanvasElement
    await downloadPosterPdf(canvas, 'qrhub.pdf')
    const blob = createUrl.mock.calls[0]![0] as Blob
    expect(blob.type).toBe('application/pdf')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const text = new TextDecoder().decode(bytes)
    const start = text.indexOf('stream\n') + 'stream\n'.length
    const length = Number(/\/Filter \/FlateDecode \/Length (\d+)/.exec(text)![1])
    const rgbStream = new Blob([bytes.slice(start, start + length)]).stream()
      .pipeThrough(new DecompressionStream('deflate'))
    expect(new Uint8Array(await new Response(rgbStream).arrayBuffer()))
      .toEqual(new Uint8Array([250, 10, 75, 255, 255, 255]))
    expect(anchor).toMatchObject({ href: 'blob:poster', download: 'qrhub.pdf' })
    expect(anchor.remove).toHaveBeenCalledOnce()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:poster')
  })
})
