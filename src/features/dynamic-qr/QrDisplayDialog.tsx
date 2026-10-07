import { presentQrStatus } from '@/shared/presentation/qr-status'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { QrPresentation } from './QrPresentation'
import { QrDisplayShell } from './QrDisplayShell'
import { copyExactPresentedLink, presentDynamicQrRowLink, writeQrClipboardText } from './qr-presentation'

interface QrDisplayDialogProps {
  readonly row: DynamicQrRow | null
  readonly onOpenChange: (open: boolean) => void
}

export function QrDisplayDialog({ row, onOpenChange }: QrDisplayDialogProps) {
  if (!row) return null
  const link = presentDynamicQrRowLink(row)
  const status = presentQrStatus(row.statusCode)
  return <QrDisplayShell onOpenChange={onOpenChange}>
    <QrPresentation qrId={row.pkey} terminalName={row.terminalName}
      amountLabel={formatMoney(row.amount)} statusLabel={status.label} statusTone={status.tone}
      link={link} unavailableMessage="Bu QR uchun xavfsiz kanonik havola mavjud emas."
      onCopy={link.kind === 'available' ? () => copyExactPresentedLink(link, writeQrClipboardText) : undefined} />
  </QrDisplayShell>
}
