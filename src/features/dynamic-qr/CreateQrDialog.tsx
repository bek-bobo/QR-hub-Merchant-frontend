import { useCallback, useState } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateQrContent } from './CreateQrContent'
import type { CreateResultModel } from './create-result'

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
        className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-1rem)] w-[calc(100%-1rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-popover p-0 text-popover-foreground shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100%-2rem)]"
        onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }}
        onPointerDownOutside={(event) => { if (pending) event.preventDefault() }}
      >
        <header className="border-b px-5 py-4 pr-14 sm:px-6">
          <DialogPrimitive.Title className="text-xl font-semibold text-text-primary">
            {resultKind === 'confirmed' ? 'QR ko‘rsatish'
              : resultKind === 'unknown' ? 'Natija tasdiqlanmadi'
                : resultKind ? 'QR yaratilmadi' : 'Dinamik QR yaratish'}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-text-secondary">
            {resultKind === 'confirmed'
              ? 'Yaratilgan QR tafsilotlari va kanonik havolasi.'
              : resultKind
                ? 'Natija tafsilotlarini ko‘rib chiqing va keyingi amalni tanlang.'
                : 'Terminalni tanlang va summani UZSda kiriting.'}
          </DialogPrimitive.Description>
        </header>
        <DialogPrimitive.Close asChild>
          <Button type="button" variant="ghost" size="icon-sm" className="absolute right-4 top-4" disabled={pending} aria-label="Yopish">
            <XIcon aria-hidden="true" />
          </Button>
        </DialogPrimitive.Close>
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <CreateQrContent embedded resetOnMount onPendingChange={setPending}
            onResultModeChange={setResultKind} onClose={() => changeOpen(false)} />
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
