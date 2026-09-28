import type { XlsxDownload } from '@/shared/api/xlsx-download'

export function handoffXlsxDownload(file: XlsxDownload): () => void {
  const url = URL.createObjectURL(file.blob)
  const anchor = document.createElement('a')
  let timer: ReturnType<typeof setTimeout> | null = null
  let released = false
  const release = () => {
    if (released) return
    released = true
    if (timer !== null) clearTimeout(timer)
    anchor.remove()
    URL.revokeObjectURL(url)
  }
  try {
    anchor.href = url
    anchor.download = file.filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    timer = setTimeout(release, 1000)
    return release
  } catch (error) {
    release()
    throw error
  }
}

export function createExportDownloadIntent(deps: {
  readonly getXlsx: (query: Readonly<Record<string, string>>, signal: AbortSignal) => Promise<XlsxDownload>
  readonly isCurrent: () => boolean
  readonly handoff: (file: XlsxDownload) => () => void
}) {
  let flight: AbortController | null = null
  let generation = 0
  let releaseDownload: (() => void) | null = null
  return {
    get pending() { return flight !== null },
    cancel() {
      generation++
      flight?.abort()
      flight = null
    },
    invalidate() {
      generation++
      flight?.abort()
      flight = null
      releaseDownload?.()
      releaseDownload = null
    },
    async run(query: Readonly<Record<string, string>>): Promise<'handed-off' | 'failed' | 'stale' | 'duplicate' | 'not-sent'> {
      if (flight) return 'duplicate'
      if (!deps.isCurrent()) return 'not-sent'
      const controller = new AbortController()
      const intentGeneration = ++generation
      const snapshot = Object.freeze({ ...query })
      flight = controller
      const current = () => !controller.signal.aborted && generation === intentGeneration && deps.isCurrent()
      try {
        const file = await deps.getXlsx(snapshot, controller.signal)
        if (!current()) return 'stale'
        releaseDownload?.()
        releaseDownload = deps.handoff(file)
        return 'handed-off'
      } catch {
        return current() ? 'failed' : 'stale'
      } finally {
        if (flight === controller) flight = null
      }
    },
  }
}
