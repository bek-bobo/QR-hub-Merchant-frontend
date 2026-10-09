import { useDynamicQrPresentation } from './presentation'
import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { QrCodeIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QR_POSTER_LOGO_URL } from './qr-poster'
import { DetailsDialogHeader, detailsCloseClasses, detailsSurfaceClasses } from '@/shared/ui/DetailsDialog'

export const QR_DISPLAY_SIZE_CLASSES = 'max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-4xl md:max-h-[calc(100dvh-3rem)] md:w-[92vw]'

export function QrDisplayHeader({ inDialog = false }: { readonly inDialog?: boolean }) {
  const p = useDynamicQrPresentation()
  const Title = inDialog ? Dialog.Title : 'h3'
  const Description = inDialog ? Dialog.Description : 'p'
  return <div className="flex min-w-0 items-center gap-4">
    <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
      {/* Crop the emblem from the existing combined emblem/wordmark asset. */}
      <span className="block size-8 bg-primary" style={{ maskImage: `url(${QR_POSTER_LOGO_URL})`,
        maskSize: 'auto 100%', maskPosition: 'left center', maskRepeat: 'no-repeat' }} />
    </span>
    <div className="min-w-0">
      <Title className="text-xl font-semibold text-text-primary sm:text-2xl">{p.message('display.title')}</Title>
      <Description className="mt-1 text-sm text-text-secondary">{p.message('display.description')}</Description>
    </div>
  </div>
}

export function QrDisplayShell({ children, onOpenChange }: {
  readonly children: ReactNode
  readonly onOpenChange: (open: boolean) => void
}) {
  const p = useDynamicQrPresentation()
  return <Dialog.Root open onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-xs" />
      <Dialog.Content className={`fixed left-1/2 top-1/2 z-50 ${QR_DISPLAY_SIZE_CLASSES} ${detailsSurfaceClasses} -translate-x-1/2 -translate-y-1/2 overflow-y-auto`}>
        <DetailsDialogHeader icon={QrCodeIcon} title={p.message('display.title')} subtitle={p.message('display.description')} />
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" size="icon" className={detailsCloseClasses} aria-label={p.common('actions.close')}><XIcon aria-hidden="true" /></Button>
        </Dialog.Close>
        <div className="px-5 pb-5 sm:px-7 md:px-5">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
