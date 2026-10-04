import { QrPresentation } from '@/features/dynamic-qr/QrPresentation'
import { QrDisplayShell } from '@/features/dynamic-qr/QrDisplayShell'
import { copyExactPresentedLink, presentQrLink, writeQrClipboardText } from '@/features/dynamic-qr/qr-presentation'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'

interface TerminalQrContentProps { readonly row: TerminalRow }

export function TerminalQrContent({ row }: TerminalQrContentProps) {
  const link = presentQrLink(row.staticQrLink)
  const status = presentActiveStatus(row.statusCode)
  return <QrPresentation qrId={row.staticQrId ?? '—'} terminalName={row.name}
    merchantName={row.merchantName} statusLabel={status.label} statusTone={status.tone}
    additionalMetadata={[{ label: 'Terminal ID', value: row.pkey }]}
    link={link} unavailableMessage="Bu terminal uchun xavfsiz Statik QR havolasi mavjud emas."
    onCopy={link.kind === 'available' ? () => copyExactPresentedLink(link, writeQrClipboardText) : undefined} />
}

export function TerminalQrDialog({ row, onOpenChange }: {
  readonly row: TerminalRow | null; readonly onOpenChange: (open: boolean) => void
}) {
  if (!row) return null
  return <QrDisplayShell onOpenChange={onOpenChange}><TerminalQrContent row={row} /></QrDisplayShell>
}
