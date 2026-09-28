import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/shared/auth/useAuth'
import { formatUzbekPhoneDisplay } from '@/shared/presentation/phone'
import { PageHeader } from '@/shared/ui/PageHeader'

export function AccountPage() {
  const { actions, pending, profile, profileRefreshMessage } = useAuth()

  if (!profile) {
    return null
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader title="Hisob" />
      <section aria-labelledby="account-title">
        <Card>
          <CardHeader>
            <CardTitle id="account-title">Hisob ma’lumotlari</CardTitle>
            <CardDescription>
              Joriy kirish sessiyasiga tegishli tasdiqlangan profil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-lg border bg-muted/40 p-4">
                <dt className="text-sm text-text-secondary">F.I.Sh.</dt>
                <dd className="mt-1 break-words font-medium text-text-primary">
                  {profile.fullname?.trim() || 'Ko‘rsatilmagan'}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg border bg-muted/40 p-4">
                <dt className="text-sm text-text-secondary">Telefon</dt>
                <dd className="mt-1 break-words font-medium text-text-primary">
                  {formatUzbekPhoneDisplay(profile.phone)}
                </dd>
              </div>
            </dl>

            {profileRefreshMessage ? (
              <p className="text-sm text-text-secondary" role="status" aria-live="polite">
                {profileRefreshMessage}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={pending.profileRefresh || pending.logout}
                onClick={() => void actions.refreshProfile()}
              >
                {pending.profileRefresh
                  ? 'Yangilanmoqda…'
                  : 'Ma’lumotni yangilash'}
              </Button>
              <Button
                type="button"
                className="bg-brand hover:bg-primary-hover"
                disabled={pending.logout}
                onClick={() => void actions.logout()}
              >
                {pending.logout ? 'Chiqilmoqda…' : 'Chiqish'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
