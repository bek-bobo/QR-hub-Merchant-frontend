import { lazy, Suspense, useState } from 'react'
import { CircleHelpIcon } from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/app/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import type { DashboardPreview } from '@/features/dashboard/model'
import { can } from '@/shared/auth/access'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoAccessState,
} from '@/shared/ui/AsyncState'
import { ForbiddenPage, NotFoundPage } from '@/shared/ui/SystemPages'

const AuthPreviewPage = import.meta.env.DEV
  ? lazy(() => import('@/dev/auth/AuthPreviewPage'))
  : null

const ReadPreviewRoot = import.meta.env.DEV
  ? lazy(() => import('@/dev/read/ReadPreviewRoot'))
  : null

const Day4PreviewRoot = import.meta.env.DEV
  ? lazy(() => import('@/dev/day4/Day4PreviewRoot'))
  : null

const Day5PreviewRoot = import.meta.env.DEV
  ? lazy(() => import('@/dev/day5/Day5PreviewRoot'))
  : null

const Day6PreviewRoot = import.meta.env.DEV
  ? lazy(() => import('@/dev/day6/Day6PreviewRoot'))
  : null

function DashboardRoute({ preview }: { preview: DashboardPreview }) {
  const access = useAccessContext()

  if (!can(access, 'dashboard.read', true)) {
    return <ForbiddenPage />
  }

  return (
    <AppShell title="Bosh sahifa" allowDemo>
      <DashboardPage preview={preview} />
    </AppShell>
  )
}

function DevUiRoute() {
  const [retryCount, setRetryCount] = useState(0)

  return (
    <AppShell title="UI holatlari" allowDemo>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-brand">Development gallery</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
            UI holatlari
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Bu sintetik development preview; real merchant funksiyasi emas.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>LoadingState</CardTitle>
              <CardDescription>Ma’lumot kutilayotgan holat.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoadingState />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>EmptyState</CardTitle>
              <CardDescription>Natija mavjud bo‘lmagan holat.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState description="Tanlangan davr uchun Dinamik QR yozuvlari topilmadi." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ErrorState</CardTitle>
              <CardDescription>Ichki tafsilotlarsiz xavfsiz xato holati.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ErrorState onRetry={() => setRetryCount((count) => count + 1)} />
              <p className="text-xs text-text-secondary" aria-live="polite">
                Lokal qayta urinishlar: {retryCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>NoAccessState</CardTitle>
              <CardDescription>Ruxsat berilmagan holat.</CardDescription>
            </CardHeader>
            <CardContent>
              <NoAccessState />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Noma’lum status</CardTitle>
              <CardDescription>Tasdiqlanmagan kod neytral ko‘rsatiladi.</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="border-border bg-muted text-text-secondary">
                <CircleHelpIcon aria-hidden="true" />
                Noma’lum (999)
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

interface AppRouterProps {
  preview: DashboardPreview
}

export function AppRouter({ preview }: AppRouterProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardRoute preview={preview} />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/dev/ui" element={<DevUiRoute />} />
        {AuthPreviewPage ? (
          <Route
            path="/dev/auth"
            element={
              <Suspense
                fallback={
                  <main className="app flex items-center justify-center">
                    <div className="w-full max-w-lg">
                      <LoadingState description="Auth preview tayyorlanmoqda." />
                    </div>
                  </main>
                }
              >
                <AuthPreviewPage />
              </Suspense>
            }
          />
        ) : null}
        {ReadPreviewRoot ? (
          <Route
            path="/dev/read/*"
            element={
              <Suspense
                fallback={
                  <main className="app flex items-center justify-center">
                    <div className="w-full max-w-lg">
                      <LoadingState description="Read preview tayyorlanmoqda." />
                    </div>
                  </main>
                }
              >
                <ReadPreviewRoot />
              </Suspense>
            }
          />
        ) : null}
        {Day4PreviewRoot ? (
          <Route path="/dev/day4/*" element={<Suspense fallback={<LoadingState
            description="Day 04 preview tayyorlanmoqda." />}><Day4PreviewRoot /></Suspense>} />
        ) : null}
        {Day5PreviewRoot ? (
          <Route path="/dev/day5/*" element={<Suspense fallback={<LoadingState
            description="Day 05 preview tayyorlanmoqda." />}><Day5PreviewRoot /></Suspense>} />
        ) : null}
        {Day6PreviewRoot ? (
          <Route path="/dev/day6/*" element={<Suspense fallback={<LoadingState
            description="Day 06 preview tayyorlanmoqda." />}><Day6PreviewRoot /></Suspense>} />
        ) : null}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
