import { lazy, Suspense, type ReactNode } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router'
import { Header } from '@/app/layout/Header'
import { LiveShellLayout } from '@/app/layout/LiveShellLayout'
import { LiveRouteStatus } from '@/app/LiveRouteStatus'
import {
  decideLiveFeatureRoute,
  isLiveRouteAccessible,
  liveFeatureRouteDefinitions,
  type LiveFeatureRoute as LiveFeatureRouteName,
} from '@/app/live-route-policy'
import { buildLiveLoginLandingContext, resolveLoginLanding } from '@/app/login-landing'
import { getVisibleLiveNavigationItems } from '@/app/navigation'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { resolveLiveRootRoute } from '@/app/root-route'
import { LoginPage } from '@/features/auth/LoginPage'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { useAuth } from '@/shared/auth/useAuth'
import { LoadingState } from '@/shared/ui/AsyncState'

const AccountPage = lazy(() => import('@/features/account/AccountPage').then((module) => ({ default: module.AccountPage })))
const DashboardReadPage = lazy(() => import('@/features/dashboard/DashboardReadPage').then((module) => ({ default: module.DashboardReadPage })))
const DynamicQrPage = lazy(() => import('@/features/dynamic-qr/DynamicQrPage').then((module) => ({ default: module.DynamicQrPage })))
const CreateQrPage = lazy(() => import('@/features/dynamic-qr/CreateQrPage').then((module) => ({ default: module.CreateQrPage })))
const ExportQrPage = lazy(() => import('@/features/dynamic-qr/ExportQrPage').then((module) => ({ default: module.ExportQrPage })))
const StaticQrPage = lazy(() => import('@/features/static-qr/StaticQrPage').then((module) => ({ default: module.StaticQrPage })))
const TerminalPage = lazy(() => import('@/features/terminals/TerminalPage').then((module) => ({ default: module.TerminalPage })))
const BankAccountPage = lazy(() => import('@/features/bank-accounts/BankAccountPage').then((module) => ({ default: module.BankAccountPage })))
const CashierPage = lazy(() => import('@/features/cashiers/CashierPage').then((module) => ({ default: module.CashierPage })))
const P5Page = lazy(() => import('@/features/p5/P5Page').then((module) => ({ default: module.P5Page })))

function FullPageLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-workspace px-4">
      <div className="w-full max-w-lg">
        <LoadingState
          title="Sessiya tekshirilmoqda"
          description="Profil ma’lumotlari xavfsiz tarzda yuklanmoqda."
        />
      </div>
    </main>
  )
}

function LiveShell({
  children,
  pageTitle,
}: {
  children: ReactNode
  pageTitle?: string
}) {
  const access = useAccessContext()
  const runtime = useReadRuntime()
  const { actions, pending, profile } = useAuth()
  const visibleItems = getVisibleLiveNavigationItems(access, runtime.readiness)
  const identityLabel =
    profile?.fullname?.trim() ||
    (profile?.phone ? `+${profile.phone}` : 'Merchant foydalanuvchi')

  return (
    <LiveShellLayout
      header={(navigation) => (
        <Header
          title={pageTitle}
          titleAsHeading={Boolean(pageTitle)}
          navigationOpen={navigation.open}
          navigationControls={navigation.controls}
          navigationTriggerRef={navigation.triggerRef}
          onOpenNavigation={navigation.openNavigation}
          identityLabel={identityLabel}
          identitySecondary={profile?.roles[0]}
          compactAccountControls
          logoutPending={pending.logout}
          onLogout={() => void actions.logout()}
        />
      )}
      navigationItems={visibleItems}
    >
      {children}
    </LiveShellLayout>
  )
}

function LoginRoute() {
  const { sessionPhase } = useAuth()
  const access = useAccessContext()
  const runtime = useReadRuntime()
  const location = useLocation()

  if (sessionPhase === 'bootstrapping' || sessionPhase === 'terminating') {
    return <FullPageLoading />
  }

  if (sessionPhase === 'authenticated') {
    return <Navigate to={resolveLoginLanding(buildLiveLoginLandingContext({
      state: location.state,
      access,
      registrations: runtime.readiness,
    }))} replace />
  }

  if (sessionPhase === 'access-denied') {
    return <Navigate to="/403" replace />
  }

  return <LoginPage />
}

function AccountRoute() {
  const access = useAccessContext()
  const { sessionPhase } = useAuth()
  const runtime = useReadRuntime()
  const location = useLocation()

  if (sessionPhase === 'bootstrapping' || sessionPhase === 'terminating') {
    return <FullPageLoading />
  }

  if (sessionPhase === 'access-denied') {
    return <Navigate to="/403" replace />
  }

  if (sessionPhase !== 'authenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname }}
      />
    )
  }

  if (!isLiveRouteAccessible('/account', {
    access,
    registrations: runtime.readiness,
  })) {
    return <Navigate to="/403" replace />
  }

  return (
    <LiveShell pageTitle="Hisob">
      <Suspense fallback={<LoadingState title="Hisob sahifasi yuklanmoqda" />}><AccountPage /></Suspense>
    </LiveShell>
  )
}

const featurePresentation = {
  dashboard: {
    unavailableTitle: 'Dashboard hozircha sozlanmagan',
    unavailableDescription:
      'Dashboard funksiyasi ushbu muhitda hozircha mavjud emas.',
  },
  dynamicQr: {
    unavailableTitle: 'Dinamik QR ro‘yxati hozircha sozlanmagan',
    unavailableDescription:
      'Dinamik QR ro‘yxati ushbu muhitda hozircha mavjud emas.',
  },
  exportQr: {
    unavailableTitle: 'XLSX eksport hozircha sozlanmagan',
    unavailableDescription:
      'XLSX eksport ushbu muhitda hozircha mavjud emas.',
  },
  staticQr: {
    unavailableTitle: 'Statik QR ro‘yxati hozircha sozlanmagan',
    unavailableDescription:
      'Statik QR ro‘yxati ushbu muhitda hozircha mavjud emas.',
  },
  terminals: {
    unavailableTitle: 'Terminal ro‘yxati hozircha sozlanmagan',
    unavailableDescription: 'Terminal ro‘yxati ushbu muhitda hozircha mavjud emas.',
  },
  bankAccounts: {
    unavailableTitle: 'Bank hisoblari ro‘yxati hozircha sozlanmagan',
    unavailableDescription: 'Bank hisoblari ro‘yxati ushbu muhitda hozircha mavjud emas.',
  },
  cashiers: {
    unavailableTitle: 'Kassirlar ro‘yxati hozircha sozlanmagan',
    unavailableDescription: 'Kassirlar ro‘yxati ushbu muhitda hozircha mavjud emas.',
  },
  devices: {
    unavailableTitle: 'P5 qurilmalari ro‘yxati hozircha sozlanmagan',
    unavailableDescription: 'P5 qurilmalari ro‘yxati ushbu muhitda hozircha mavjud emas.',
  },
} as const satisfies Record<
  LiveFeatureRouteName,
  {
    readonly unavailableTitle: string
    readonly unavailableDescription: string
  }
>

function LiveFeatureRoute({
  feature,
  children,
  pageTitle,
}: {
  feature: LiveFeatureRouteName
  children: ReactNode
  pageTitle?: string
}) {
  const access = useAccessContext()
  const { sessionPhase } = useAuth()
  const runtime = useReadRuntime()
  const location = useLocation()
  const decision = decideLiveFeatureRoute(feature, {
    sessionPhase,
    access,
    registrations: runtime.readiness,
  })
  const presentation = featurePresentation[feature]

  if (decision === 'pending') {
    return <FullPageLoading />
  }

  if (decision === 'login') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname }}
      />
    )
  }

  if (decision === 'forbidden') {
    return <Navigate to="/403" replace />
  }

  if (decision === 'unavailable') {
    return (
      <LiveShell>
        <LiveRouteStatus
          kind="unavailable"
          title={presentation.unavailableTitle}
          description={presentation.unavailableDescription}
        />
      </LiveShell>
    )
  }

  return (
    <LiveShell pageTitle={pageTitle}>
      {children}
    </LiveShell>
  )
}

function DashboardRoute() {
  return (
    <LiveFeatureRoute feature="dashboard" pageTitle="Dashboard">
      <Suspense fallback={<LoadingState title="Dashboard sahifasi yuklanmoqda" />}><DashboardReadPage /></Suspense>
    </LiveFeatureRoute>
  )
}

function DynamicQrRoute() {
  const location = useLocation()

  return (
    <LiveFeatureRoute
      feature="dynamicQr"
      pageTitle="Dinamik QRlar"
    >
      <Suspense fallback={<LoadingState title="Dinamik QRlar sahifasi yuklanmoqda" />}><DynamicQrPage initialState={location.state} /></Suspense>
    </LiveFeatureRoute>
  )
}

function StaticQrRoute() {
  return <LiveFeatureRoute feature="staticQr" pageTitle="Statik QRlar"><Suspense fallback={<LoadingState title="Statik QRlar sahifasi yuklanmoqda" />}><StaticQrPage /></Suspense></LiveFeatureRoute>
}

function TerminalRoute() {
  return <LiveFeatureRoute feature="terminals" pageTitle="Terminallar"><Suspense fallback={<LoadingState title="Terminallar sahifasi yuklanmoqda" />}><TerminalPage /></Suspense></LiveFeatureRoute>
}

function BankAccountRoute() {
  return <LiveFeatureRoute feature="bankAccounts" pageTitle="Bank hisoblari"><Suspense fallback={<LoadingState title="Bank hisoblari sahifasi yuklanmoqda" />}><BankAccountPage /></Suspense></LiveFeatureRoute>
}

function CashierRoute() {
  return <LiveFeatureRoute feature="cashiers" pageTitle="Kassirlar"><Suspense fallback={<LoadingState title="Kassirlar sahifasi yuklanmoqda" />}><CashierPage /></Suspense></LiveFeatureRoute>
}

function CreateCashierRoute() {
  return <Navigate to="/cashiers" replace />
}

function DevicesRoute() {
  return <LiveFeatureRoute feature="devices" pageTitle="P5 qurilmalari"><Suspense fallback={<LoadingState title="P5 qurilmalari sahifasi yuklanmoqda" />}><P5Page /></Suspense></LiveFeatureRoute>
}

function CreateQrRoute() {
  const access = useAccessContext()
  const { sessionPhase } = useAuth()
  const runtime = useReadRuntime()
  const location = useLocation()
  if (sessionPhase === 'bootstrapping' || sessionPhase === 'terminating') return <FullPageLoading />
  if (sessionPhase === 'anonymous' || sessionPhase === 'bootstrap-error') {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />
  }
  if (!isLiveRouteAccessible('/dynamic-qrs/new', {
    access,
    registrations: runtime.readiness,
  })) return <Navigate to="/403" replace />
  return <LiveShell><Suspense fallback={<LoadingState title="QR yaratish sahifasi yuklanmoqda" />}><CreateQrPage /></Suspense></LiveShell>
}

function ExportQrRoute() {
  return <LiveFeatureRoute feature="exportQr"><Suspense fallback={<LoadingState title="XLSX eksport sahifasi yuklanmoqda" />}><ExportQrPage /></Suspense></LiveFeatureRoute>
}

function ForbiddenRoute() {
  const { sessionPhase } = useAuth()

  if (sessionPhase === 'bootstrapping' || sessionPhase === 'terminating') {
    return <FullPageLoading />
  }

  if (sessionPhase === 'anonymous' || sessionPhase === 'bootstrap-error') {
    return <Navigate to="/login" replace />
  }

  return (
    <LiveShell>
      <LiveRouteStatus
        kind="forbidden"
        title="Ruxsat mavjud emas"
        description="Bu bo‘lim uchun tasdiqlangan ruxsat topilmadi. Chiqish amali bundan qat’i nazar mavjud."
      />
    </LiveShell>
  )
}

function LiveNotFoundRoute() {
  const { sessionPhase } = useAuth()
  const access = useAccessContext()
  const runtime = useReadRuntime()
  const location = useLocation()
  const rootDecision = resolveLiveRootRoute({
    pathname: location.pathname,
    sessionPhase,
    authenticatedLanding: location.pathname === '/' && sessionPhase === 'authenticated'
      ? resolveLoginLanding(buildLiveLoginLandingContext({
        state: null,
        access,
        registrations: runtime.readiness,
      }))
      : null,
  })

  if (rootDecision.kind === 'redirect') {
    return <Navigate to={rootDecision.to} replace />
  }

  const destination =
    sessionPhase === 'authenticated'
      ? '/account'
      : sessionPhase === 'access-denied'
        ? '/403'
        : '/login'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-workspace px-4">
      <section className="w-full max-w-lg rounded-xl border bg-surface p-6 shadow-sm">
        <p className="text-sm font-medium text-brand">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary">
          Sahifa topilmadi
        </h1>
        <p className="mt-2 text-text-secondary">
          Bu manzil live merchant doirasida mavjud emas.
        </p>
        <Link
          to={destination}
          className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Xavfsiz sahifaga qaytish
        </Link>
      </section>
    </main>
  )
}

export function LiveRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/account" element={<AccountRoute />} />
        <Route
          path={liveFeatureRouteDefinitions.dashboard.path}
          element={<DashboardRoute />}
        />
        <Route
          path={liveFeatureRouteDefinitions.dynamicQr.path}
          element={<DynamicQrRoute />}
        />
        <Route path={liveFeatureRouteDefinitions.staticQr.path} element={<StaticQrRoute />} />
        <Route path={liveFeatureRouteDefinitions.terminals.path} element={<TerminalRoute />} />
        <Route path={liveFeatureRouteDefinitions.bankAccounts.path} element={<BankAccountRoute />} />
        <Route path={liveFeatureRouteDefinitions.cashiers.path} element={<CashierRoute />} />
        <Route path="/cashiers/new" element={<CreateCashierRoute />} />
        <Route path={liveFeatureRouteDefinitions.devices.path} element={<DevicesRoute />} />
        <Route path="/dynamic-qrs/new" element={<CreateQrRoute />} />
        <Route path="/dynamic-qrs/export" element={<ExportQrRoute />} />
        <Route path="/403" element={<ForbiddenRoute />} />
        <Route path="*" element={<LiveNotFoundRoute />} />
      </Routes>
    </BrowserRouter>
  )
}
