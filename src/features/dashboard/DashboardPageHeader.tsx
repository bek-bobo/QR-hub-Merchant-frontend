import type { ReactNode } from 'react'
import { RefreshCwIcon } from 'lucide-react'
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
      {updatedAt ? (
        <span className="text-xs text-text-secondary sm:self-end">
          Oxirgi yangilanish: {updatedAt}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        {quickFilters ? <div className="min-w-0 w-full sm:w-auto">{quickFilters}</div> : null}
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
          {children}
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
        </div>
      </div>
    </div>
  )
}
