import { useDashboardPresentation } from './presentation'
import { useMessages } from '@/shared/i18n/useMessages'
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
  const p = useDashboardPresentation()
  const common = useMessages('common')
  return (
    <div className="dashboard-filter-toolbar flex min-w-0 flex-col gap-2 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm sm:px-4">
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
                  className="h-9 rounded-xl bg-surface px-3"
                  disabled={refreshDisabled}
                  onClick={onRefresh}
                >
                  <RefreshCwIcon className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
                  {common.message('actions.refresh')}
                </Button>
              </Tooltip.Trigger>
              {updatedAt ? (
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    sideOffset={6}
                    className="z-50 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
                  >
                    {p.message('states.updatedAt', {time: updatedAt})}
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
