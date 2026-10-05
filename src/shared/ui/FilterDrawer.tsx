import { useState, type ReactNode } from 'react'
import { CircleCheckIcon, ListFilterIcon, RotateCwIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react'
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
import './filter-drawer.css'

interface FilterDrawerProps {
  readonly children: ReactNode
  readonly description?: ReactNode
  readonly onApply: () => boolean | void
  readonly onReset: () => void
  readonly onOpenChange?: (open: boolean) => void
  readonly applyDisabled?: boolean
  readonly triggerSize?: 'default' | 'sm'
  readonly triggerClassName?: string
}

export function FilterDrawer({
  children,
  description,
  onApply,
  onReset,
  onOpenChange,
  applyDisabled = false,
  triggerSize = 'default',
  triggerClassName,
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
          className={`w-fit max-w-full ${triggerClassName ?? ''}`}
        >
          <ListFilterIcon aria-hidden="true" />
          Filtrlar
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="filter-drawer min-h-0 gap-0 overflow-hidden rounded-l-3xl border-border bg-surface p-0 shadow-xl data-[side=right]:w-full data-[side=right]:sm:max-w-[33.75rem]"
      >
        <SheetHeader className="filter-drawer-header relative shrink-0 overflow-hidden border-b px-5 py-6 pr-20 text-left sm:px-8 sm:pr-20">
          <div className="relative flex min-w-0 items-center gap-5">
            <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <SlidersHorizontalIcon className="size-7" />
            </span>
            <SheetTitle className="text-2xl font-semibold">Filtrlar</SheetTitle>
          </div>
          {description ? (
            <SheetDescription className="relative mt-3">{description}</SheetDescription>
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
              className="absolute right-5 top-7 size-11 rounded-full bg-primary/10 hover:bg-primary/15 sm:right-8"
              aria-label="Filtrlarni yopish"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6">
          <div className="min-w-0 space-y-4">{children}</div>
        </div>

        <SheetFooter className="mt-0 shrink-0 flex-row items-center justify-between gap-3 border-t bg-surface px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button type="button" variant="outline" className="h-12 min-w-0 flex-1 gap-2 rounded-xl px-3 text-sm sm:max-w-56 sm:text-base" onClick={handlers.reset}>
            <RotateCwIcon aria-hidden="true" className="size-5" />
            Qayta tiklash
          </Button>
          <Button type="button" className="h-12 min-w-0 flex-1 gap-2 rounded-xl px-3 text-sm sm:max-w-48 sm:text-base" disabled={applyDisabled} onClick={handlers.apply}>
            <CircleCheckIcon aria-hidden="true" className="size-5" />
            Qo‘llash
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
