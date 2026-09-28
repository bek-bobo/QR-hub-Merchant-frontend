import { useState, type ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  title: string
  children: ReactNode
  allowDemo: boolean
}

export function AppShell({ title, children, allowDemo }: AppShellProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)

  return (
    <div className="min-h-dvh min-w-0 overflow-x-hidden bg-workspace text-text-primary lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <Sidebar allowDemo={allowDemo} />
      </div>

      <div className="min-w-0">
        <Header
          title={title}
          navigationOpen={mobileNavigationOpen}
          navigationControls="demo-mobile-navigation"
          onOpenNavigation={() => setMobileNavigationOpen(true)}
        />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <Sheet
        open={mobileNavigationOpen}
        onOpenChange={setMobileNavigationOpen}
      >
        <SheetContent
          id="demo-mobile-navigation"
          side="left"
          className="w-[min(20rem,85vw)] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Asosiy navigatsiya</SheetTitle>
          <SheetDescription className="sr-only">
            QRHub Merchant bo‘limlari
          </SheetDescription>
          <Sidebar
            allowDemo={allowDemo}
            onNavigate={() => setMobileNavigationOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
