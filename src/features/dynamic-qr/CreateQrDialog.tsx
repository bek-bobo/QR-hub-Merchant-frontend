import { useCallback, useState } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-xs" />
      <DialogPrimitive.Content
        className={resultKind === 'confirmed'
          ? `fixed left-1/2 top-1/2 z-50 ${QR_DISPLAY_SIZE_CLASSES} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-popover p-0 text-popover-foreground shadow-2xl`
          : 'fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-1rem)] w-[calc(100%-1rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-popover p-0 text-popover-foreground shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100%-2rem)]'}
        onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }}
        onPointerDownOutside={(event) => { if (pending) event.preventDefault() }}
      >
        {resultKind === 'confirmed' ? <header className="px-5 pb-1 pt-5 pr-16 sm:px-7 sm:pt-7 sm:pr-20 md:px-5 md:pb-0 md:pt-5 md:pr-16"><QrDisplayHeader inDialog /></header> : <header className="border-b px-5 py-4 pr-14 sm:px-6">
          <DialogPrimitive.Title className="text-xl font-semibold text-text-primary">
            {resultKind === 'unknown' ? 'Natija tasdiqlanmadi'
              : resultKind ? 'QR yaratilmadi' : 'Dinamik QR yaratish'}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-text-secondary">
            {resultKind
              ? 'Natija tafsilotlarini ko‘rib chiqing va keyingi amalni tanlang.'
              : 'Terminalni tanlang va summani UZSda kiriting.'}
          </DialogPrimitive.Description>
        </header>}
        <DialogPrimitive.Close asChild>
          <Button type="button" variant={resultKind === 'confirmed' ? 'outline' : 'ghost'}
            size={resultKind === 'confirmed' ? 'icon' : 'icon-sm'}
            className={resultKind === 'confirmed' ? 'absolute right-5 top-5 sm:right-7 sm:top-7 md:right-5 md:top-5' : 'absolute right-4 top-4'}
            disabled={pending} aria-label="Yopish">
            <XIcon aria-hidden="true" />
          </Button>
        </DialogPrimitive.Close>
        <div className={resultKind === 'confirmed' ? 'p-5 sm:p-7 md:p-5 md:pt-3' : 'px-4 py-4 sm:px-6 sm:py-5'}>
          <CreateQrContent embedded resetOnMount onPendingChange={setPending}
            onResultModeChange={setResultKind} onClose={() => changeOpen(false)} />
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
