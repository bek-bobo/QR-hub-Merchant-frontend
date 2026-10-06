import { useCallback, useState } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { QrCodeIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { detailsSurfaceClasses } from '@/shared/ui/DetailsDialog'
import { CreateQrContent } from './CreateQrContent'
import type { CreateResultModel } from './create-result'
import { QrDisplayHeader, QR_DISPLAY_SIZE_CLASSES } from './QrDisplayShell'

interface CreateQrDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function CreateQrDialog({ open, onOpenChange }: CreateQrDialogProps) {
  const [pending, setPending] = useState(false)
  const [resultKind, setResultKind] = useState<CreateResultModel['kind'] | null>(null)
  const changeOpen = useCallback((next: boolean) => {
    if (!next && pending) return
    setResultKind(null)
    onOpenChange(next)
  }, [onOpenChange, pending])

  return <DialogPrimitive.Root open={open} onOpenChange={changeOpen}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={resultKind === 'confirmed'
          ? `fixed left-1/2 top-1/2 z-50 ${QR_DISPLAY_SIZE_CLASSES} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-popover p-0 text-popover-foreground shadow-2xl`
          : `fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto ${detailsSurfaceClasses} p-0 sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]`}
        onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }}
        onPointerDownOutside={(event) => { if (pending) event.preventDefault() }}
      >
        {resultKind === 'confirmed' ? <header className="px-5 pb-1 pt-5 pr-16 sm:px-7 sm:pt-7 sm:pr-20 md:px-5 md:pb-0 md:pt-5 md:pr-16"><QrDisplayHeader inDialog /></header> : <header className="relative overflow-hidden border-b border-border/70 px-5 py-6 pr-16 sm:px-10 sm:py-8 sm:pr-20">
          <svg aria-hidden="true" viewBox="0 0 768 128" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full text-brand-soft">
            <path fill="currentColor" opacity="0.45" d="M0 0H768V128H535C607 113 623 41 687 30C719 24 746 20 768 0Z" />
            <path fill="currentColor" opacity="0.3" d="M588 128C666 102 690 49 768 52V128Z" />
          </svg>
          <div className="relative flex min-w-0 items-center gap-4 sm:gap-7">
            <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-primary sm:size-16">
              <QrCodeIcon className="size-7 sm:size-8" />
            </span>
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-xl font-semibold tracking-tight text-text-primary sm:text-[28px] sm:leading-9">
                {resultKind === 'unknown' ? 'Natija tasdiqlanmadi'
                  : resultKind ? 'QR yaratilmadi' : 'Dinamik QR yaratish'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-text-secondary sm:text-lg">
                {resultKind
                  ? 'Natija tafsilotlarini ko‘rib chiqing va keyingi amalni tanlang.'
                  : 'Terminalni tanlang va summani UZSda kiriting.'}
              </DialogPrimitive.Description>
            </div>
          </div>
        </header>}
        <DialogPrimitive.Close asChild>
          <Button type="button" variant={resultKind === 'confirmed' ? 'outline' : 'ghost'}
            size="icon"
            className={resultKind === 'confirmed' ? 'absolute right-5 top-5 sm:right-7 sm:top-7 md:right-5 md:top-5' : 'absolute right-4 top-5 size-10 rounded-full bg-muted/80 text-text-primary hover:bg-muted sm:right-7 sm:top-8 sm:size-11'}
            disabled={pending} aria-label="Yopish">
            <XIcon aria-hidden="true" />
          </Button>
        </DialogPrimitive.Close>
        <div className={resultKind === 'confirmed' ? 'p-5 sm:p-7 md:p-5 md:pt-3' : 'px-5 pb-6 pt-5 sm:px-10 sm:pt-5'}>
          <CreateQrContent embedded resetOnMount onPendingChange={setPending}
            onResultModeChange={setResultKind} onClose={() => changeOpen(false)} />
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
