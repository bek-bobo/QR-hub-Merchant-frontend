import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'

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
}

export function ShellNavigation({ items, label, onNavigate, collapsed = false }: ShellNavigationProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label={label}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            aria-label={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors ${
                collapsed ? 'justify-center px-2' : 'gap-3 px-3'
              } ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
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
