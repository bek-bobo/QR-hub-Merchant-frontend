import type { Ref } from 'react'
import { LogOutIcon, MenuIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { ThemeModeSelect } from '@/shared/theme/ThemeModeSelect'

interface HeaderProps {
  title?: string
  titleAsHeading?: boolean
  onOpenNavigation?: () => void
  navigationOpen?: boolean
  navigationControls?: string
  navigationTriggerRef?: Ref<HTMLButtonElement>
  identityLabel?: string
  identitySecondary?: string
  compactAccountControls?: boolean
  logoutPending?: boolean
  onLogout?: () => void
}

export function Header({
  title,
  titleAsHeading = false,
  onOpenNavigation,
  navigationOpen = false,
  navigationControls,
  navigationTriggerRef,
  identityLabel,
  identitySecondary,
  compactAccountControls = false,
  logoutPending = false,
  onLogout,
}: HeaderProps) {
  return (
    <header className="flex min-w-0 items-center justify-between gap-2 border-b bg-surface px-4 py-4 sm:gap-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {onOpenNavigation ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Navigatsiyani ochish"
            aria-expanded={navigationOpen}
            aria-controls={navigationControls}
            ref={navigationTriggerRef}
            onClick={onOpenNavigation}
          >
            <MenuIcon aria-hidden="true" />
          </Button>
        ) : null}
        {title ? (
          titleAsHeading ? (
            <h1 className="min-w-0 truncate text-lg font-semibold text-text-primary sm:text-xl">
              {title}
            </h1>
          ) : (
            <span className="min-w-0 truncate text-sm font-medium text-text-secondary sm:text-base">
              {title}
            </span>
          )
        ) : null}
      </div>

      {onLogout && compactAccountControls ? (
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          <Link
            to="/account"
            aria-label="Hisobni ochish"
            aria-describedby="account-avatar-tooltip"
            className="group relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-soft text-xs font-semibold uppercase text-brand outline-none ring-offset-2 ring-offset-surface transition-shadow focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span
              id="account-avatar-tooltip"
              role="tooltip"
              className="pointer-events-none invisible absolute right-[calc(100%+0.5rem)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-md border bg-surface px-2.5 py-2 text-right normal-case opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 sm:block"
            >
              <span className="block max-w-48 truncate text-sm font-medium text-text-primary">
                {identityLabel ?? 'Merchant foydalanuvchi'}
              </span>
              {identitySecondary ? (
                <span className="mt-0.5 block max-w-48 truncate text-xs text-text-secondary">
                  {identitySecondary}
                </span>
              ) : null}
            </span>
            <span aria-hidden="true">
              {(identityLabel ?? 'M').trim().slice(0, 1) || 'M'}
            </span>
          </Link>
          <ThemeModeSelect compact />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={logoutPending ? 'Chiqilmoqda' : 'Chiqish'}
            title="Chiqish"
            disabled={logoutPending}
            onClick={onLogout}
          >
            <LogOutIcon aria-hidden="true" />
          </Button>
        </div>
      ) : onLogout ? (
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <ThemeModeSelect />
          <span className="hidden max-w-52 truncate text-sm font-medium text-text-primary sm:block">
            {identityLabel ?? 'Merchant foydalanuvchi'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={logoutPending}
            onClick={onLogout}
          >
            {logoutPending ? 'Chiqilmoqda…' : 'Chiqish'}
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className="text-sm font-medium text-text-primary">Demo Store</span>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
            Demo — namuna ma’lumotlari
          </span>
        </div>
      )}
    </header>
  )
}
