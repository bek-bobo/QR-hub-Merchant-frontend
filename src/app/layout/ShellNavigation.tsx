import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

export interface ShellNavigationItem {
  readonly path: string
  readonly label: string
  readonly icon: LucideIcon
}

interface ShellNavigationProps {
  readonly items: readonly ShellNavigationItem[]
  readonly label: string
  readonly onNavigate?: () => void
  readonly collapsed?: boolean
  readonly className?: string
}

export function ShellNavigation({ items, label, onNavigate, collapsed = false, className }: ShellNavigationProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <nav className={cn('relative flex flex-col gap-2 p-3 pt-5', className)} aria-label={label}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            aria-label={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `group relative flex min-h-13 items-center rounded-xl py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sidebar-ring focus-visible:outline-offset-2 ${
                collapsed ? 'justify-center px-2' : 'gap-5 px-5'
              } ${
                isActive
                  ? 'bg-primary bg-linear-to-br from-primary to-primary-hover text-primary-foreground before:absolute before:inset-y-3.5 before:left-1 before:w-0.5 before:rounded-full before:bg-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {collapsed ? (
              <span
                role="tooltip"
                className="pointer-events-none invisible absolute left-[calc(100%+0.5rem)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100"
              >
                {item.label}
              </span>
            ) : (
              <span>{item.label}</span>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
