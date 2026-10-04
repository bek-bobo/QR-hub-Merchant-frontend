import type { ReactNode } from 'react'
import { RefreshCwIcon } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import { Button } from '@/components/ui/button'

interface DashboardPageHeaderProps {
  readonly children: ReactNode
  readonly quickFilters?: ReactNode
  readonly updatedAt?: string
  readonly refreshDisabled: boolean
  readonly refreshing: boolean
  readonly onRefresh: () => void
}

export function DashboardPageHeader({
  children,
  quickFilters,
  updatedAt,
  refreshDisabled,
  refreshing,
  onRefresh,
}: DashboardPageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        {quickFilters ? <div className="min-w-0 w-full sm:w-auto">{quickFilters}</div> : null}
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
          {children}
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={refreshDisabled}
                  onClick={onRefresh}
                >
                  <RefreshCwIcon className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
                  Yangilash
                </Button>
              </Tooltip.Trigger>
              {updatedAt ? (
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    sideOffset={6}
                    className="z-50 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
                  >
                    Oxirgi yangilanish: {updatedAt}
                  </Tooltip.Content>
                </Tooltip.Portal>
              ) : null}
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>
    </div>
  )
}
