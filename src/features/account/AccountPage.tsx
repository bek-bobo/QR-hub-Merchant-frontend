import { useMessages } from '@/shared/i18n/useMessages'
import { MonitorIcon, PhoneIcon, RefreshCwIcon, UserIcon, UsersIcon } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/shared/auth/useAuth'
import { formatUzbekPhoneDisplay } from '@/shared/presentation/phone'

// Display labels only; authorization still uses accepted GET_ME permissions.
function profileRole(roles: readonly string[]) {
  const unique = [...new Set(roles)]
  if (unique.length !== 1) return 'roles.unknown'
  if (unique[0] === 'ROLE_MERCHANT') return 'roles.merchant'
  if (unique[0] === 'ROLE_MERCHANT_USER') return 'roles.cashier'
  return 'roles.unknown'
}

export function AccountPage() {
  const { message } = useMessages('account')
  const { actions, pending, profile, profileRefreshMessage } = useAuth()
  if (!profile) return null
  const refreshLabel = pending.profileRefresh ? message('states.refreshing') : message('actions.refresh')
  const fieldClass = 'min-w-0 space-y-1'
  const labelClass = 'text-sm text-text-secondary 2xl:text-base'
  const valueClass = 'text-base 2xl:text-lg font-semibold text-text-primary [overflow-wrap:anywhere]'
  const iconClass = 'flex size-12 shrink-0 items-center justify-center rounded-full bg-muted/50 text-text-primary xl:size-14 2xl:size-16'

  return <section aria-labelledby="account-title" className="w-full min-w-0 pt-2">
    <h2 id="account-title" className="sr-only">{message('title')}</h2>
    <Card className="relative gap-0 rounded-2xl border border-border/70 p-5 shadow-sm ring-0 sm:p-7 xl:py-7 2xl:py-6 xl:pl-9 xl:pr-12">
      <dl className="grid min-w-0 items-center gap-y-6 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-5 sm:pr-6 xl:gap-6">
          <span aria-hidden="true" className="flex size-20 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand xl:size-24 2xl:size-26"><UserIcon className="size-9 stroke-[1.5] xl:size-11" /></span>
          <div className={fieldClass}><dt className={labelClass}>{message('profile.fullName')}</dt>
            <dd className={valueClass}>{profile.fullname?.trim() || message('profile.missing')}</dd></div>
        </div>
        <div className="flex min-w-0 items-center gap-4 border-t border-border pt-6 sm:min-h-20 sm:border-l sm:border-t-0 sm:px-6 sm:pt-0">
          <span aria-hidden="true" className={iconClass}><PhoneIcon className="size-6 stroke-[1.7]" /></span>
          <div className={fieldClass}><dt className={labelClass}>{message('profile.phone')}</dt>
            <dd dir="ltr" className={valueClass}>{formatUzbekPhoneDisplay(profile.phone) || message('profile.missing')}</dd></div>
        </div>
        <div className="flex min-w-0 items-center gap-4 border-t border-border pt-6 sm:min-h-20 sm:pr-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <span aria-hidden="true" className={iconClass}><UsersIcon className="size-6 stroke-[1.7]" /></span>
          <div className={fieldClass}><dt className={labelClass}>{message('profile.role')}</dt>
            <dd className="inline-flex max-w-full rounded-full bg-brand-soft px-4 py-1.5 text-sm 2xl:text-base font-semibold text-brand [overflow-wrap:anywhere] dark:text-status-error-foreground">{message(profileRole(profile.roles))}</dd></div>
        </div>
        <div className="flex min-w-0 items-center gap-4 border-t border-border pt-6 sm:min-h-20 sm:border-l sm:pl-6 xl:border-t-0 xl:pt-0">
          <span aria-hidden="true" className={iconClass}><MonitorIcon className="size-6 stroke-[1.7]" /></span>
          <div className={fieldClass}><dt className={labelClass}>{message('profile.deviceType')}</dt>
            {/* Current client environment, not a fabricated GET_ME field. */}
            <dd className={valueClass}>{message('profile.deviceWeb')}</dd></div>
        </div>
      </dl>
      <div className="absolute right-2 top-2">
        <Tooltip.Provider delayDuration={200}><Tooltip.Root>
          <Tooltip.Trigger asChild><Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg text-text-secondary"
            aria-label={refreshLabel} aria-busy={pending.profileRefresh} disabled={pending.profileRefresh || pending.logout}
            onClick={() => { if (!pending.profileRefresh && !pending.logout) void actions.refreshProfile() }}>
            <RefreshCwIcon className={pending.profileRefresh ? 'size-3.5 motion-safe:animate-spin' : 'size-3.5'} aria-hidden="true" />
          </Button></Tooltip.Trigger>
          <Tooltip.Portal><Tooltip.Content side="top" sideOffset={8} collisionPadding={12} className="z-[110] max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-sm">{refreshLabel}</Tooltip.Content></Tooltip.Portal>
        </Tooltip.Root></Tooltip.Provider>
      </div>
    </Card>
      {profileRefreshMessage ? <p className="mt-4 text-sm text-text-secondary" role="status" aria-live="polite">
        {message(profileRefreshMessage === 'changed' ? 'feedback.changed' : profileRefreshMessage === 'unchanged' ? 'feedback.unchanged' : 'feedback.failed')}
      </p> : null}
  </section>
}
