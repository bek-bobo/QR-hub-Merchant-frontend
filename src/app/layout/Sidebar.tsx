import { useMessages } from '@/shared/i18n/useMessages'
import { NavLink } from 'react-router'
import { navigationItems, presentNavigationItems } from '@/app/navigation'
import { can } from '@/shared/auth/access'
import { useAccessContext } from '@/shared/auth/useAccessContext'

interface SidebarProps {
  allowDemo: boolean
  onNavigate?: () => void
}

export function Sidebar({ allowDemo, onNavigate }: SidebarProps) {
  const messages = useMessages('shell')
  const { message } = messages
  const common = useMessages('common')
  const access = useAccessContext()
  const visibleItems = presentNavigationItems(navigationItems.filter((item) =>
    can(access, item.capability, allowDemo),
  ), messages)

  return (
    <aside className="flex h-full min-h-dvh w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <div className="text-lg font-semibold tracking-tight">QRHub Merchant</div>
        <div className="mt-1 text-xs text-sidebar-foreground/70">
          {message('workspace')}</div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label={message('navigation.main')}>
        {visibleItems.length === 0 ? (
          <p className="px-3 py-2 text-sm text-sidebar-foreground/70">
            {message('navigation.empty')}</p>
        ) : null}

        {visibleItems.map((item) => {
          if (item.availability === 'scheduled') {
            return (
              <div
                key={item.path}
                aria-disabled="true"
                className="rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/65"
              >
                <div>{item.label}</div>
                <div className="mt-0.5 text-xs">{common.message('states.unavailable')}</div>
              </div>
            )
          }

          return (
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
          )
        })}
      </nav>
    </aside>
  )
}
