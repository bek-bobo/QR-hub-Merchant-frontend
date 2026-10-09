import { useMessages } from '@/shared/i18n/useMessages'
import { LogOutIcon, PencilIcon, PhoneIcon, UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/shared/auth/useAuth'
import { formatUzbekPhoneDisplay } from '@/shared/presentation/phone'

export function AccountPage() {
  const { message } = useMessages('account')
  const auth = useMessages('auth')
  const canLogout = auth.critical('actions.logout').status === 'resolved'
  const { actions, pending, profile, profileRefreshMessage } = useAuth()

  if (!profile) {
    return null
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <section aria-labelledby="account-title">
        <Card className="gap-5 rounded-2xl border border-border/70 shadow-sm ring-0 [--card-spacing:--spacing(5)] sm:gap-6 sm:[--card-spacing:--spacing(6)]">
          <CardHeader className="flex flex-row items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <UserIcon className="size-5" aria-hidden="true" />
            </span>
            <CardTitle className="min-w-0 text-xl font-semibold text-text-primary">
              <h2 id="account-title">{message('title')}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="relative flex min-h-22 min-w-0 flex-col justify-center rounded-xl border border-border/70 bg-muted/20 py-4 pr-18 pl-5">
                <dt className="text-sm text-text-secondary">
                  {message('profile.fullName')}<span className="absolute top-1/2 right-5 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-text-secondary">
                    <UserIcon className="size-5" aria-hidden="true" />
                  </span>
                </dt>
                <dd className="mt-1 text-base font-semibold text-text-primary [overflow-wrap:anywhere]">
                  {profile.fullname?.trim() ? profile.fullname : message('profile.missing')}
                </dd>
              </div>
              <div className="relative flex min-h-22 min-w-0 flex-col justify-center rounded-xl border border-border/70 bg-muted/20 py-4 pr-18 pl-5">
                <dt className="text-sm text-text-secondary">
                  {message('profile.phone')}<span className="absolute top-1/2 right-5 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-text-secondary">
                    <PhoneIcon className="size-5" aria-hidden="true" />
                  </span>
                </dt>
                <dd className="mt-1 text-base font-semibold text-text-primary [overflow-wrap:anywhere]">
                  {formatUzbekPhoneDisplay(profile.phone)}
                </dd>
              </div>
            </dl>

            {profileRefreshMessage ? (
              <p className="text-sm text-text-secondary" role="status" aria-live="polite">
                {message(profileRefreshMessage === 'changed' ? 'feedback.changed' : profileRefreshMessage === 'unchanged' ? 'feedback.unchanged' : 'feedback.failed')}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2.5 rounded-lg bg-muted/50 px-4 font-semibold text-text-primary shadow-sm"
                disabled={pending.profileRefresh || pending.logout}
                onClick={() => void actions.refreshProfile()}
              >
                <PencilIcon className="size-4 text-text-secondary" aria-hidden="true" />
                {pending.profileRefresh
                  ? message('states.refreshing')
                  : message('actions.refresh')}
              </Button>
              <Button
                type="button"
                className="h-10 gap-2.5 rounded-lg bg-brand px-6 font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
                disabled={pending.logout || !canLogout}
                onClick={() => { if (canLogout) void actions.logout() }}
              >
                <LogOutIcon className="size-4" aria-hidden="true" />
                {pending.logout ? auth.message('states.signingOut') : auth.message('actions.logout')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
