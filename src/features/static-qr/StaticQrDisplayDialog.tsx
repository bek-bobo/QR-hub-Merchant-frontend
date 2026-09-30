import { Dialog as DialogPrimitive } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { QrPresentation } from '@/features/dynamic-qr/QrPresentation'
import {
  copyExactPresentedLink,
  presentQrLink,
  type QrCopyOutcome,
} from '@/features/dynamic-qr/qr-presentation'
import type { StaticQrRow } from './contract'

interface StaticQrDisplayDialogProps {
  readonly row: StaticQrRow | null
  readonly onOpenChange: (open: boolean) => void
}

export function StaticQrDisplayDialog({ row, onOpenChange }: StaticQrDisplayDialogProps) {
  if (!row) return null
  const link = presentQrLink(row.link)

  async function copyLink(): Promise<QrCopyOutcome> {
    return copyExactPresentedLink(link, async (text) => {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
    })
  }

  return <DialogPrimitive.Root open onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-xs" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-popover p-0 text-popover-foreground shadow-2xl">
        <header className="border-b px-5 py-4 pr-14 sm:px-6 sm:py-5">
          <DialogPrimitive.Title className="text-xl font-semibold text-text-primary">QR ko‘rsatish</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-text-secondary">
            Backend taqdim etgan kanonik havola asosidagi Statik QR.
          </DialogPrimitive.Description>
        </header>
        <DialogPrimitive.Close asChild>
          <Button type="button" variant="ghost" size="icon-sm" className="absolute right-4 top-4" aria-label="Yopish">
            <XIcon aria-hidden="true" />
          </Button>
        </DialogPrimitive.Close>
        <div className="p-4 sm:p-6">
          <QrPresentation
            qrId={row.id}
            terminalName={row.terminalName}
            merchantName={row.merchantName}
            statusLabel={presentActiveStatus(row.statusCode).label}
            link={link}
            unavailableMessage="Bu QR uchun xavfsiz kanonik havola mavjud emas."
            onCopy={link.kind === 'available' ? copyLink : undefined}
            footer={<DialogPrimitive.Close asChild>
              <Button type="button" variant="outline">Yopish</Button>
            </DialogPrimitive.Close>}
          />
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
