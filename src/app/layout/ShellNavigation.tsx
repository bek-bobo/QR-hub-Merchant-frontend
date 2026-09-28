import { NavLink } from 'react-router'

export interface ShellNavigationItem {
  readonly path: string
  readonly label: string
}

interface ShellNavigationProps {
  readonly items: readonly ShellNavigationItem[]
  readonly label: string
  readonly onNavigate?: () => void
}

export function ShellNavigation({ items, label, onNavigate }: ShellNavigationProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label={label}>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
