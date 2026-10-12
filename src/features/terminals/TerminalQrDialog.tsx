import { useTerminalPresentation } from './presentation'
import { QrPresentation } from '@/features/dynamic-qr/QrPresentation'
import { QrDisplayShell } from '@/features/dynamic-qr/QrDisplayShell'
import { copyExactPresentedLink, presentQrLink, writeQrClipboardText } from '@/features/dynamic-qr/qr-presentation'
import type { TerminalRow } from '@/shared/contracts/management-read'

interface TerminalQrContentProps { readonly row: TerminalRow }

export function TerminalQrContent({ row }: TerminalQrContentProps) {
  const p = useTerminalPresentation()
  const link = presentQrLink(row.staticQrLink)
  const status = p.status(row.statusCode)
  return <QrPresentation qrId={row.staticQrId ?? '—'} terminalName={row.name}
    merchantName={row.merchantName} statusLabel={status.label} statusTone={status.tone}
    additionalMetadata={[{ label: p.message('fields.terminalId'), value: row.pkey }]}
    link={link} unavailableMessage={p.message('display.noLink')}
    onCopy={link.kind === 'available' ? () => copyExactPresentedLink(link, writeQrClipboardText) : undefined} />
}

export function TerminalQrDialog({ row, onOpenChange }: {
  readonly row: TerminalRow | null; readonly onOpenChange: (open: boolean) => void
}) {
  if (!row) return null
  return <QrDisplayShell onOpenChange={onOpenChange}><TerminalQrContent row={row} /></QrDisplayShell>
}
