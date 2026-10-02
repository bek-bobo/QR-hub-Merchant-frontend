import { Dialog as DialogPrimitive } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { presentQrStatus } from '@/features/dashboard/presenters'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { QrPresentation } from './QrPresentation'
import {
  copyExactPresentedLink,
  presentDynamicQrRowLink,
  type QrCopyOutcome,
} from './qr-presentation'

interface QrDisplayDialogProps {
  readonly row: DynamicQrRow | null
  readonly onOpenChange: (open: boolean) => void
}

export function QrDisplayDialog({ row, onOpenChange }: QrDisplayDialogProps) {
  if (!row) return null
  const link = presentDynamicQrRowLink(row)

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
        </header>
        <DialogPrimitive.Close asChild>
          <Button type="button" variant="ghost" size="icon-sm" className="absolute right-4 top-4" aria-label="Yopish">
            <XIcon aria-hidden="true" />
          </Button>
        </DialogPrimitive.Close>
        <div className="p-4 sm:p-6">
          <QrPresentation
            qrId={row.pkey}
            terminalName={row.terminalName}
            amountLabel={formatMoney(row.amount)}
            statusLabel={presentQrStatus(row.statusCode).label}
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
