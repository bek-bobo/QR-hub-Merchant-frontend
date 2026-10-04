import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QR_POSTER_LOGO_URL } from './qr-poster'

export const QR_DISPLAY_SIZE_CLASSES = 'max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-4xl md:max-h-[calc(100dvh-3rem)] md:w-[92vw]'

export function QrDisplayHeader({ inDialog = false }: { readonly inDialog?: boolean }) {
  const Title = inDialog ? Dialog.Title : 'h3'
  const Description = inDialog ? Dialog.Description : 'p'
  return <div className="flex min-w-0 items-center gap-4">
    <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
      {/* Crop the emblem from the existing combined emblem/wordmark asset. */}
      <span className="block size-8 bg-primary" style={{ maskImage: `url(${QR_POSTER_LOGO_URL})`,
        maskSize: 'auto 100%', maskPosition: 'left center', maskRepeat: 'no-repeat' }} />
    </span>
    <div className="min-w-0">
      <Title className="text-xl font-semibold text-text-primary sm:text-2xl">QR ko‘rsatish</Title>
      <Description className="mt-1 text-sm text-text-secondary">To‘lov uchun QR ma’lumotlari</Description>
    </div>
  </div>
}

export function QrDisplayShell({ children, onOpenChange }: {
  readonly children: ReactNode
  readonly onOpenChange: (open: boolean) => void
}) {
  return <Dialog.Root open onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-xs" />
      <Dialog.Content className={`fixed left-1/2 top-1/2 z-50 ${QR_DISPLAY_SIZE_CLASSES} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-popover p-5 text-popover-foreground shadow-2xl sm:p-7 md:p-5`}>
        <header className="mb-6 pr-12 md:mb-3"><QrDisplayHeader inDialog /></header>
        <Dialog.Close asChild>
          <Button type="button" variant="outline" size="icon" className="absolute right-5 top-5 sm:right-7 sm:top-7 md:right-5 md:top-5" aria-label="Yopish"><XIcon aria-hidden="true" /></Button>
        </Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
