import type { ReactNode } from 'react'
import { cn } from 'cn'

interface PageHeaderProps {
  readonly title: ReactNode
  readonly eyebrow?: ReactNode
  readonly description?: ReactNode
  readonly descriptionId?: string
  readonly meta?: ReactNode
  readonly actions?: ReactNode
  readonly className?: string
}

export function PageHeader({
  title,
  eyebrow,
  description,
  descriptionId,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-wide text-brand">{eyebrow}</p>
        ) : null}
        <h1
          className={cn(
            'break-words text-2xl font-semibold leading-tight tracking-tight text-text-primary',
            eyebrow && 'mt-1',
          )}
        >
          {title}
        </h1>
        {description ? (
          <p id={descriptionId} className="mt-1 max-w-3xl text-sm leading-5 text-text-secondary">
            {description}
          </p>
        ) : null}
        {meta ? (
          <p className="mt-1 text-xs leading-4 text-text-secondary">{meta}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end sm:pt-0.5">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
