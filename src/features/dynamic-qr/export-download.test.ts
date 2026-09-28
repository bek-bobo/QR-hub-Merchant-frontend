import { describe, expect, it, vi } from 'vitest'
import type { XlsxDownload } from '@/shared/api/xlsx-download'
import { createExportDownloadIntent, handoffXlsxDownload } from './export-download'

const file: XlsxDownload = { blob: new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1])]), filename: 'dynamic-qrs.xlsx' }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('explicit export download intent', () => {
  it('does not dispatch or hand off without export permission', async () => {
    const getXlsx = vi.fn(async () => file)
    const handoff = vi.fn(() => vi.fn())
    const intent = createExportDownloadIntent({ getXlsx, isCurrent: () => false, handoff })
    expect(await intent.run({ status: '0' })).toBe('not-sent')
    expect(getXlsx).not.toHaveBeenCalled()
    expect(handoff).not.toHaveBeenCalled()
  })
  it('allows only one request for rapid repeated clicks and hands off once', async () => {
    const gate = deferred<XlsxDownload>()
    const getXlsx = vi.fn((_query: Readonly<Record<string, string>>, _signal: AbortSignal) => gate.promise)
    const handoff = vi.fn(() => vi.fn())
    const intent = createExportDownloadIntent({ getXlsx, isCurrent: () => true, handoff })
    const first = intent.run({ status: '0' })
    expect(await intent.run({ status: '0' })).toBe('duplicate')
    expect(getXlsx).toHaveBeenCalledTimes(1)
    gate.resolve(file)
    expect(await first).toBe('handed-off')
    expect(handoff).toHaveBeenCalledTimes(1)
    expect(handoff).toHaveBeenCalledWith(file)
  })

  it('captures a separate immutable applied query; draft and page edits do not mutate it', async () => {
    const gate = deferred<XlsxDownload>()
    const getXlsx = vi.fn((_query: Readonly<Record<string, string>>, _signal: AbortSignal) => gate.promise)
    const intent = createExportDownloadIntent({ getXlsx, isCurrent: () => true, handoff: () => vi.fn() })
    const applied = { fromDate: '2026-09-09', status: '0' }
    const flight = intent.run(applied)
    applied.status = '10'
    expect(getXlsx.mock.calls[0]?.[0]).toEqual({ fromDate: '2026-09-09', status: '0' })
    gate.resolve(file)
    await flight
  })

  it('suppresses late download after logout, permission revision or applied-filter replacement', async () => {
    for (const reason of ['logout', 'permission', 'filter']) {
      const gate = deferred<XlsxDownload>()
      const handoff = vi.fn(() => vi.fn())
      const intent = createExportDownloadIntent({ getXlsx: () => gate.promise,
        isCurrent: () => true, handoff })
      const flight = intent.run({ reason })
      intent.invalidate()
      gate.resolve(file)
      expect(await flight).toBe('stale')
      expect(handoff).not.toHaveBeenCalled()
    }
  })

  it('checks current permission after an already-started safe GET', async () => {
    const gate = deferred<XlsxDownload>()
    let permitted = true
    const handoff = vi.fn(() => vi.fn())
    const intent = createExportDownloadIntent({ getXlsx: () => gate.promise,
      isCurrent: () => permitted, handoff })
    const flight = intent.run({})
    permitted = false
    gate.resolve(file)
    expect(await flight).toBe('stale')
    expect(handoff).not.toHaveBeenCalled()
  })

  it('cancels a pending request and releases a completed handoff on invalidation', async () => {
    const release = vi.fn()
    const intent = createExportDownloadIntent({ getXlsx: async () => file,
      isCurrent: () => true, handoff: () => release })
    expect(await intent.run({})).toBe('handed-off')
    intent.invalidate()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('removes the temporary anchor and revokes its object URL', () => {
    const remove = vi.fn()
    const click = vi.fn()
    const anchor = { href: '', download: '', click, remove }
    const appendChild = vi.fn()
    const oldDocument = globalThis.document
    const oldCreate = URL.createObjectURL
    const oldRevoke = URL.revokeObjectURL
    Object.defineProperty(globalThis, 'document', { configurable: true,
      value: { createElement: () => anchor, body: { appendChild } } })
    URL.createObjectURL = vi.fn(() => 'blob:example')
    URL.revokeObjectURL = vi.fn()
    try {
      const release = handoffXlsxDownload(file)
      expect(anchor.download).toBe('dynamic-qrs.xlsx')
      expect(click).toHaveBeenCalledTimes(1)
      expect(appendChild).toHaveBeenCalledTimes(1)
      expect(remove).toHaveBeenCalledTimes(1)
      release()
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:example')
    } finally {
      Object.defineProperty(globalThis, 'document', { configurable: true, value: oldDocument })
      URL.createObjectURL = oldCreate
      URL.revokeObjectURL = oldRevoke
    }
  })
})
