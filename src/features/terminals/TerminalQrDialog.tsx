import { Dialog } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QrPresentation } from '@/features/dynamic-qr/QrPresentation'
import { copyExactPresentedLink, presentQrLink } from '@/features/dynamic-qr/qr-presentation'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'

interface TerminalQrContentProps { readonly row: TerminalRow }

export function TerminalQrContent({ row }: TerminalQrContentProps) {
  const link = presentQrLink(row.staticQrLink)
  return <div className="min-w-0 space-y-4 p-4 [overflow-wrap:anywhere] sm:p-6">
    <p className="break-all text-sm text-text-secondary">Terminal ID: {row.pkey}</p>
    <QrPresentation qrId={row.staticQrId ?? '—'} terminalName={row.name}
      merchantName={row.merchantName} statusLabel={presentActiveStatus(row.statusCode).label}
      link={link} unavailableMessage="Bu terminal uchun xavfsiz Statik QR havolasi mavjud emas."
      onCopy={link.kind === 'available' ? () => copyExactPresentedLink(link, async (text) => {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
        await navigator.clipboard.writeText(text)
      }) : undefined} />
  </div>
}

export function TerminalQrDialog({ row, onOpenChange }: {
  readonly row: TerminalRow | null; readonly onOpenChange: (open: boolean) => void
}) {
  if (!row) return null
  return <Dialog.Root open onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-xs" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-popover text-popover-foreground shadow-2xl">
        <header className="border-b px-5 py-4 pr-14 sm:px-6">
          <Dialog.Title className="text-xl font-semibold text-text-primary">Statik QR ko‘rish</Dialog.Title>
          <Dialog.Description className="text-sm text-text-secondary">Terminalning backend taqdim etgan Statik QR havolasi.</Dialog.Description>
        </header>
        <Dialog.Close asChild><Button type="button" variant="ghost" size="icon-sm" className="absolute right-4 top-4" aria-label="Yopish"><XIcon aria-hidden="true" /></Button></Dialog.Close>
        <TerminalQrContent row={row} />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
