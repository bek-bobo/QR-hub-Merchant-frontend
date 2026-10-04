import { useState, type ReactNode } from 'react'
import { ListFilterIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { createFilterDrawerHandlers } from './filter-drawer-state'

interface FilterDrawerProps {
  readonly children: ReactNode
  readonly description?: ReactNode
  readonly onApply: () => boolean | void
  readonly onReset: () => void
  readonly onOpenChange?: (open: boolean) => void
  readonly applyDisabled?: boolean
  readonly triggerSize?: 'default' | 'sm'
}

export function FilterDrawer({
  children,
  description,
  onApply,
  onReset,
  onOpenChange,
  applyDisabled = false,
  triggerSize = 'default',
}: FilterDrawerProps) {
  const [open, setOpen] = useState(false)
  const handlers = createFilterDrawerHandlers({ setOpen, onApply, onReset, onOpenChange })

  return (
    <Sheet open={open} onOpenChange={handlers.setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={triggerSize}
          className="w-fit max-w-full"
        >
          <ListFilterIcon aria-hidden="true" />
          Filtrlar
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full max-w-[27.5rem] gap-0 p-0"
      >
        <SheetHeader className="relative shrink-0 border-b px-4 py-4 pr-14 text-left">
          <SheetTitle>Filtrlar</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">
              Ro‘yxat uchun filtrlarni sozlang.
            </SheetDescription>
          )}
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3"
              aria-label="Filtrlarni yopish"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="min-w-0 space-y-4">{children}</div>
        </div>

        <SheetFooter className="mt-0 shrink-0 flex-row items-center justify-between border-t bg-popover px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="outline" onClick={handlers.reset}>
            Qayta tiklash
          </Button>
          <Button type="button" disabled={applyDisabled} onClick={handlers.apply}>
            Qo‘llash
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
