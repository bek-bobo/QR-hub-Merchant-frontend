import type { ReactNode } from 'react'
import { RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardPageHeaderProps {
  readonly children: ReactNode
  readonly updatedAt?: string
  readonly refreshDisabled: boolean
  readonly refreshing: boolean
  readonly onRefresh: () => void
}

export function DashboardPageHeader({
  children,
  updatedAt,
  refreshDisabled,
  refreshing,
  onRefresh,
}: DashboardPageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:items-end">
      {updatedAt ? (
        <span className="text-xs text-text-secondary">
          Oxirgi yangilanish: {updatedAt}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
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
  )
}
