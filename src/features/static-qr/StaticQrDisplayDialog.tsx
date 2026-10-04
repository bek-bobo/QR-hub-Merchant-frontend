import { presentActiveStatus } from '@/shared/presentation/active-status'
import { QrPresentation } from '@/features/dynamic-qr/QrPresentation'
import { QrDisplayShell } from '@/features/dynamic-qr/QrDisplayShell'
import { copyExactPresentedLink, presentQrLink, writeQrClipboardText } from '@/features/dynamic-qr/qr-presentation'
import type { StaticQrRow } from './contract'

interface StaticQrDisplayDialogProps {
  readonly row: StaticQrRow | null
  readonly onOpenChange: (open: boolean) => void
}

export function StaticQrDisplayDialog({ row, onOpenChange }: StaticQrDisplayDialogProps) {
  if (!row) return null
  const link = presentQrLink(row.link)
  const status = presentActiveStatus(row.statusCode)
  return <QrDisplayShell onOpenChange={onOpenChange}>
    <QrPresentation qrId={row.id} terminalName={row.terminalName} merchantName={row.merchantName}
      statusLabel={status.label} statusTone={status.tone}
      link={link} unavailableMessage="Bu QR uchun xavfsiz kanonik havola mavjud emas."
      onCopy={link.kind === 'available' ? () => copyExactPresentedLink(link, writeQrClipboardText) : undefined} />
  </QrDisplayShell>
}
