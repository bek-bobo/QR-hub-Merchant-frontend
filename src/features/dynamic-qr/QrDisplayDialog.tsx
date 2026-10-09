import { useDynamicQrPresentation } from './presentation'
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
  const p = useDynamicQrPresentation()
  if (!row) return null
  const link = presentDynamicQrRowLink(row)
  const status = p.status(row.statusCode)
  return <QrDisplayShell onOpenChange={onOpenChange}>
    <QrPresentation qrId={row.pkey} terminalName={row.terminalName}
      amountLabel={formatMoney(row.amount)} statusLabel={status.label} statusTone={status.tone}
      link={link} unavailableMessage={p.message('display.noLink')}
      onCopy={link.kind === 'available' ? () => copyExactPresentedLink(link, writeQrClipboardText) : undefined} />
  </QrDisplayShell>
}
