import { useState } from 'react'
import { CopyIcon, LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { QrCopyOutcome } from './qr-presentation'

export function CanonicalLinkCard({ original, onCopy }: {
  readonly original: string
  readonly onCopy?: () => Promise<QrCopyOutcome>
}) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  async function copyLink() {
    if (!onCopy) return
    const outcome = await onCopy()
    if (outcome === 'stale') return
    setCopyStatus(outcome === 'copied' ? 'Havola nusxalandi.' : 'Havolani nusxalab bo‘lmadi.')
  }
  return <section aria-label="Kanonik havola" className="min-w-0 rounded-2xl border bg-surface p-4 sm:px-5">
    <h4 className="flex items-center gap-3 text-sm font-medium uppercase text-text-secondary">
      <span className="flex size-10 items-center justify-center rounded-xl bg-status-info-background text-status-info-foreground"><LinkIcon className="size-5" aria-hidden="true" /></span>
      Kanonik havola
    </h4>
    <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
      <p title={original} className="min-w-0 flex-1 truncate rounded-xl border bg-muted/20 px-3 py-3 text-sm text-text-primary">{original}</p>
      {onCopy ? <Button type="button" variant="outline" className="h-11 shrink-0" onClick={() => void copyLink()}><CopyIcon aria-hidden="true" />Havolani nusxalash</Button> : null}
    </div>
    {copyStatus ? <p role="status" className="mt-2 text-sm text-text-secondary">{copyStatus}</p> : null}
  </section>
}
