import { QrPresentation } from '@/features/dynamic-qr/QrPresentation'
import { QrDisplayShell } from '@/features/dynamic-qr/QrDisplayShell'
import { copyExactPresentedLink, presentQrLink, writeQrClipboardText } from '@/features/dynamic-qr/qr-presentation'
import type { P5Row } from '@/shared/contracts/p5-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'

interface P5QrContentProps { readonly row: P5Row }

export function P5QrContent({ row }: P5QrContentProps) {
  const link = presentQrLink(row.staticQrLink)
  const status = presentActiveStatus(row.staticQrStatus ?? -1)
  return <QrPresentation qrId={row.staticQrId ?? '—'} terminalName={row.terminalName}
    merchantName={row.merchantName} statusLabel={status.label} statusTone={status.tone}
    additionalMetadata={[{ label: 'Qurilma ID', value: row.deviceId }]}
    link={link} unavailableMessage="Bu qurilma uchun xavfsiz Statik QR havolasi mavjud emas."
    onCopy={link.kind === 'available' ? () => copyExactPresentedLink(link, writeQrClipboardText) : undefined} />
}

export function P5QrDialog({ row, onOpenChange }: {
  readonly row: P5Row | null; readonly onOpenChange: (open: boolean) => void
}) {
  if (!row) return null
  return <QrDisplayShell onOpenChange={onOpenChange}><P5QrContent row={row} /></QrDisplayShell>
}
