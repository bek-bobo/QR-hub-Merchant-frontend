import type { Ref } from 'react'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeModeSelect } from '@/shared/theme/ThemeModeSelect'

interface HeaderProps {
  title?: string
  onOpenNavigation?: () => void
  navigationOpen?: boolean
  navigationControls?: string
  navigationTriggerRef?: Ref<HTMLButtonElement>
  identityLabel?: string
  logoutPending?: boolean
  onLogout?: () => void
}

export function Header({
  title,
  onOpenNavigation,
  navigationOpen = false,
  navigationControls,
  navigationTriggerRef,
  identityLabel,
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
          <span className="min-w-0 truncate text-sm font-medium text-text-secondary sm:text-base">
            {title}
          </span>
        ) : null}
      </div>

      {onLogout ? (
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
