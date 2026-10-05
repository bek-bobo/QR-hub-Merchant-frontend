import { useState } from 'react'
import { LinkIcon } from 'lucide-react'
import { DetailsCopyField, DetailsFieldRow, DetailsSectionCard } from '@/shared/ui/DetailsDialog'
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
  return <DetailsSectionCard title="Kanonik havola" icon={LinkIcon}
    footer={copyStatus ? <p role="status" className="text-sm text-text-secondary">{copyStatus}</p> : null}>
    <DetailsFieldRow label="Havola"><DetailsCopyField value={original} copyable={!!onCopy} onCopy={() => void copyLink()} /></DetailsFieldRow>
  </DetailsSectionCard>
}
