import { useP5Presentation } from './presentation'
import { QrPresentation } from '@/features/dynamic-qr/QrPresentation'
import { QrDisplayShell } from '@/features/dynamic-qr/QrDisplayShell'
import { copyExactPresentedLink, presentQrLink, writeQrClipboardText } from '@/features/dynamic-qr/qr-presentation'
import type { P5Row } from '@/shared/contracts/p5-read'

interface P5QrContentProps { readonly row: P5Row }

export function P5QrContent({ row }: P5QrContentProps) {
  const p = useP5Presentation()
  const link = presentQrLink(row.staticQrLink)
  const status = p.qrStatus(row.staticQrStatus ?? -1)
  return <QrPresentation qrId={row.staticQrId ?? '—'} terminalName={row.terminalName}
    merchantName={row.merchantName} statusLabel={status.label} statusTone={status.tone}
    additionalMetadata={[{ label: p.message('fields.deviceId'), value: row.deviceId }]}
    link={link} unavailableMessage={p.message('display.noLink')}
    onCopy={link.kind === 'available' ? () => copyExactPresentedLink(link, writeQrClipboardText) : undefined} />
}

export function P5QrDialog({ row, onOpenChange }: {
  readonly row: P5Row | null; readonly onOpenChange: (open: boolean) => void
}) {
  if (!row) return null
  return <QrDisplayShell onOpenChange={onOpenChange}><P5QrContent row={row} /></QrDisplayShell>
}
