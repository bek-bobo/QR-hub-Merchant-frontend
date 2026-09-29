import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TableScrollRegionProps {
  readonly ariaLabel: string
  readonly ariaDescribedBy?: string
  readonly children: ReactNode
  readonly className?: string
}

export function TableScrollRegion({
  ariaLabel,
  ariaDescribedBy,
  children,
  className,
}: TableScrollRegionProps) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      tabIndex={0}
      className={cn(
        'w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain [&>[data-slot=table-container]]:overflow-visible',
        className,
      )}
    >
      {children}
    </div>
  )
}
