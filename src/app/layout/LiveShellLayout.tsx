import { useMessages } from '@/shared/i18n/useMessages'
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
import { reduceSidebarCollapsed } from './sidebar-collapse-state'

export interface LiveShellHeaderContext {
  readonly open: boolean
  readonly controls: string
  readonly triggerRef: RefObject<HTMLButtonElement | null>
  readonly openNavigation: () => void
  readonly sidebarCollapsed: boolean
  readonly toggleSidebar: () => void
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
  const { message } = useMessages('shell')
  const [mobileNavigationOpen, dispatch] = useReducer(
    reduceMobileNavigationOpen,
    false,
  )
  const [collapsed, toggleCollapsed] = useReducer(reduceSidebarCollapsed, false)
  const navigationTriggerRef = useRef<HTMLButtonElement>(null)

  return (
    <Sheet
      open={mobileNavigationOpen}
      onOpenChange={(open) => dispatch({ type: 'set', open })}
    >
      <div className={`merchant-workspace min-h-dvh min-w-0 bg-workspace text-text-primary lg:grid motion-safe:transition-[grid-template-columns] motion-safe:duration-200 motion-reduce:transition-none ${
        collapsed
          ? 'lg:grid-cols-[4.5rem_minmax(0,1fr)]'
          : 'lg:grid-cols-[17rem_minmax(0,1fr)]'
      }`}>
        <aside className="merchant-sidebar relative hidden bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col">
          <div className={`relative flex min-h-28 shrink-0 border-b border-sidebar-foreground/10 py-6 ${
            collapsed ? 'items-center justify-center px-2' : 'items-center px-5'
          }`}>
            <div className="flex min-w-0 items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}qrhub-favicon.svg`} alt="" className="size-10 shrink-0" />
              <div className={collapsed ? 'sr-only' : 'min-w-0'}>
                <div className="whitespace-nowrap text-base font-semibold tracking-tight">QRHub Merchant</div>
                <div className="mt-1 text-xs text-sidebar-foreground/60">{message('workspace')}</div>
              </div>
            </div>
          </div>
          <ShellNavigation
            items={navigationItems}
            label={message('navigation.desktop')}
            collapsed={collapsed}
            className={collapsed ? undefined : 'min-h-0 flex-1 overflow-y-auto'}
          />
        </aside>
        <div className="min-w-0 px-4 pt-4 sm:px-6 lg:px-7">
          {header({
            open: mobileNavigationOpen,
            controls: 'live-mobile-navigation',
            triggerRef: navigationTriggerRef,
            openNavigation: () => dispatch({ type: 'set', open: true }),
            sidebarCollapsed: collapsed,
            toggleSidebar: toggleCollapsed,
          })}
          <main className="min-w-0 py-6">{children}</main>
        </div>
      </div>

      <SheetContent
        id="live-mobile-navigation"
        side="left"
        showCloseButton={false}
        className="merchant-sidebar w-[min(20rem,85vw)] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          navigationTriggerRef.current?.focus()
        }}
      >
        <SheetHeader className="relative border-b border-sidebar-border px-5 py-5 text-left">
          <SheetTitle className="text-sidebar-foreground">QRHub Merchant</SheetTitle>
          <SheetDescription className="text-sidebar-foreground/70">
            {message('navigation.description')}</SheetDescription>
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label={message('navigation.close')}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ShellNavigation
            items={navigationItems}
            label={message('navigation.mobile')}
            onNavigate={() => dispatch({ type: 'route-selected' })}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
