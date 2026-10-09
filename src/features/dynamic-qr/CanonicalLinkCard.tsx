import { useDynamicQrPresentation } from './presentation'
import { useState } from 'react'
import { LinkIcon } from 'lucide-react'
import { DetailsCopyField, DetailsFieldRow, DetailsSectionCard } from '@/shared/ui/DetailsDialog'
import type { QrCopyOutcome } from './qr-presentation'

export function CanonicalLinkCard({ original, onCopy }: {
  readonly original: string
  readonly onCopy?: () => Promise<QrCopyOutcome>
}) {
  const p = useDynamicQrPresentation()
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed' | null>(null)
  async function copyLink() {
    if (!onCopy) return
    const outcome = await onCopy()
    if (outcome === 'stale') return
    setCopyStatus(outcome === 'copied' ? 'copied' : 'failed')
  }
  return <DetailsSectionCard title={p.message('display.canonical')} icon={LinkIcon}
    footer={copyStatus ? <p role="status" className="text-sm text-text-secondary">{p.message(copyStatus === 'copied' ? 'feedback.linkCopied' : 'feedback.linkFailed')}</p> : null}>
    <DetailsFieldRow label={p.message('display.link')}><DetailsCopyField value={original} copyable={!!onCopy} onCopy={() => void copyLink()} /></DetailsFieldRow>
  </DetailsSectionCard>
}
