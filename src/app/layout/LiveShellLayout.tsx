import { useReducer, useRef, type ReactNode, type RefObject } from 'react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ShellNavigation, type ShellNavigationItem } from './ShellNavigation'
import { reduceMobileNavigationOpen } from './mobile-navigation-state'

export interface LiveShellHeaderContext {
  readonly open: boolean
  readonly controls: string
  readonly triggerRef: RefObject<HTMLButtonElement | null>
  readonly openNavigation: () => void
}

interface LiveShellLayoutProps {
  readonly header: (navigation: LiveShellHeaderContext) => ReactNode
  readonly navigationItems: readonly ShellNavigationItem[]
  readonly children: ReactNode
}

export function LiveShellLayout({
  header,
  navigationItems,
  children,
}: LiveShellLayoutProps) {
  const [mobileNavigationOpen, dispatch] = useReducer(
    reduceMobileNavigationOpen,
    false,
  )
  const navigationTriggerRef = useRef<HTMLButtonElement>(null)

  return (
    <Sheet
      open={mobileNavigationOpen}
      onOpenChange={(open) => dispatch({ type: 'set', open })}
    >
      <div className="min-h-dvh min-w-0 bg-workspace text-text-primary lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden bg-sidebar text-sidebar-foreground lg:block lg:min-h-dvh">
          <div className="border-b border-sidebar-border px-5 py-5">
            <div className="text-lg font-semibold tracking-tight">QRHub Merchant</div>
            <div className="mt-1 text-xs text-sidebar-foreground/70">
              Merchant workspace
            </div>
          </div>
          <ShellNavigation items={navigationItems} label="Live navigatsiya" />
        </aside>
        <div className="min-w-0">
          {header({
            open: mobileNavigationOpen,
            controls: 'live-mobile-navigation',
            triggerRef: navigationTriggerRef,
            openNavigation: () => dispatch({ type: 'set', open: true }),
          })}
          <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      <SheetContent
        id="live-mobile-navigation"
        side="left"
        showCloseButton={false}
        className="w-[min(20rem,85vw)] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          navigationTriggerRef.current?.focus()
        }}
      >
        <SheetHeader className="relative border-b border-sidebar-border px-5 py-5 text-left">
          <SheetTitle className="text-sidebar-foreground">QRHub Merchant</SheetTitle>
          <SheetDescription className="text-sidebar-foreground/70">
            Merchant workspace navigatsiyasi
          </SheetDescription>
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Navigatsiyani yopish"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ShellNavigation
            items={navigationItems}
            label="Mobil navigatsiya"
            onNavigate={() => dispatch({ type: 'route-selected' })}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
