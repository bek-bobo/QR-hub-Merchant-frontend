import { useCashierPresentation } from './presentation'
import { useCallback, useState, type ComponentProps } from 'react'
import { Dialog } from 'radix-ui'
import { UserRoundIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateCashierContent } from './CreateCashierContent'

export function CreateCashierDialog({ onClose, onCloseAutoFocus }: {
  readonly onClose: () => void
  readonly onCloseAutoFocus?: ComponentProps<typeof Dialog.Content>['onCloseAutoFocus']
}) {
  const p = useCashierPresentation()
  const [pending, setPending] = useState(false)
  const changeOpen = useCallback((open: boolean) => {
    if (!open && !pending) onClose()
  }, [onClose, pending])
  return <Dialog.Root open onOpenChange={changeOpen}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-xs" />
      <Dialog.Content onCloseAutoFocus={onCloseAutoFocus} className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[43rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-popover text-popover-foreground shadow-2xl"
        onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }}
        onPointerDownOutside={(event) => { if (pending) event.preventDefault() }}>
        <header className="relative isolate shrink-0 overflow-hidden px-5 py-6 pr-16 sm:px-8 sm:py-7 sm:pr-20">
          <span aria-hidden="true" className="pointer-events-none absolute -right-16 top-7 -z-10 h-52 w-80 -rotate-[28deg] rounded-[50%] bg-brand-soft/60" />
          <div className="flex min-w-0 items-center gap-4 sm:gap-7">
            <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand sm:size-20">
              <UserRoundIcon className="size-8 sm:size-10" />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-2xl font-semibold tracking-tight text-text-primary sm:text-[1.875rem]">{p.message('actions.new')}</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-6 text-text-secondary sm:text-base">{p.message('create.description')}</Dialog.Description>
            </div>
          </div>
        </header>
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" size="icon-sm" className="absolute right-5 top-5 size-10 rounded-full bg-brand-soft text-brand hover:bg-brand-soft/80 sm:right-8 sm:top-7" disabled={pending} aria-label={p.common('actions.close')}><XIcon aria-hidden="true" /></Button>
        </Dialog.Close>
        <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 [overflow-wrap:anywhere] sm:px-8 sm:pt-6">
          <CreateCashierContent onConfirmed={onClose} onPendingChange={setPending} onCancel={() => changeOpen(false)} />
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
