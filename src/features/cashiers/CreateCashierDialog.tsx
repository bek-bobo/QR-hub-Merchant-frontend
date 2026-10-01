import { useCallback, useState, type ComponentProps } from 'react'
import { Dialog } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateCashierContent } from './CreateCashierContent'

export function CreateCashierDialog({ onClose, onCloseAutoFocus }: {
  readonly onClose: () => void
  readonly onCloseAutoFocus?: ComponentProps<typeof Dialog.Content>['onCloseAutoFocus']
}) {
  const [pending, setPending] = useState(false)
  const changeOpen = useCallback((open: boolean) => {
    if (!open && !pending) onClose()
  }, [onClose, pending])
  return <Dialog.Root open onOpenChange={changeOpen}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-xs" />
      <Dialog.Content onCloseAutoFocus={onCloseAutoFocus} className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl"
        onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }}
        onPointerDownOutside={(event) => { if (pending) event.preventDefault() }}>
        <header className="shrink-0 border-b px-4 py-4 pr-14 sm:px-6">
          <Dialog.Title className="text-xl font-semibold text-text-primary">Yangi kassir</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-text-secondary">F.I.Sh., telefon va terminalni tanlang.</Dialog.Description>
        </header>
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" size="icon-sm" className="absolute right-4 top-4" disabled={pending} aria-label="Yopish"><XIcon aria-hidden="true" /></Button>
        </Dialog.Close>
        <div className="min-h-0 min-w-0 overflow-y-auto px-4 py-5 [overflow-wrap:anywhere] sm:px-6">
          <CreateCashierContent onConfirmed={onClose} onPendingChange={setPending} />
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
