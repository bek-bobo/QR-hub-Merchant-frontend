import { LocaleSelect } from '@/shared/i18n/LocaleSelect'
import type { MessageCatalog } from '@/shared/i18n/generated'
import { useMessages } from '@/shared/i18n/useMessages'
import { lazy, Suspense, type ReactNode } from 'react'
import { LandmarkIcon, MonitorIcon, ScanLineIcon, UsersIcon } from 'lucide-react'
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
import { AppRecoveryBoundary } from '@/app/AppRecoveryBoundary'
import {
  decideLiveFeatureRoute,
  isLiveRouteAccessible,
  liveFeatureRouteDefinitions,
  type LiveFeatureRoute as LiveFeatureRouteName,
} from '@/app/live-route-policy'
import { buildLiveLoginLandingContext, resolveLoginLanding } from '@/app/login-landing'
import { getVisibleLiveNavigationItems, presentNavigationItems } from '@/app/navigation'
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
  const { message } = useMessages('shell')
  return (
    <main className="flex min-h-dvh items-center justify-center bg-workspace px-4">
      <div className="w-full max-w-lg">
        <LoadingState
          title={message('routes.sessionLoading')}
          description={message('routes.sessionDescription')}
        />
      </div>
    </main>
  )
}

function LiveShell({
  children,
  pageTitle,
  pageIcon,
}: {
  children: ReactNode
  pageTitle?: string
  pageIcon?: ReactNode
}) {
  const messages = useMessages('shell')
  const { message } = messages
  const access = useAccessContext()
  const runtime = useReadRuntime()
  const { actions, pending, profile } = useAuth()
  const visibleItems = presentNavigationItems(getVisibleLiveNavigationItems(access, runtime.readiness), messages)
  const identityLabel =
    profile?.fullname?.trim() ? profile.fullname :
    (profile?.phone ? `+${profile.phone}` : message('header.user'))

  return (
    <LiveShellLayout
      header={(navigation) => (
        <Header
          title={pageTitle}
          titleIcon={pageIcon}
          titleAsHeading={Boolean(pageTitle)}
          navigationOpen={navigation.open}
          navigationControls={navigation.controls}
          navigationTriggerRef={navigation.triggerRef}
          onOpenNavigation={navigation.openNavigation}
          sidebarCollapsed={navigation.sidebarCollapsed}
          onToggleSidebar={navigation.toggleSidebar}
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
  const { message } = useMessages('shell')
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
    <LiveShell pageTitle={message('navigation.account')}>
      <Suspense fallback={<LoadingState title={message('routes.accountLoading')} />}><AccountPage /></Suspense>
    </LiveShell>
  )
}

const featurePresentation = {
  dashboard: {
    unavailableTitle: 'unavailable.dashboardTitle',
    unavailableDescription: 'unavailable.dashboardDescription',
  },
  dynamicQr: {
    unavailableTitle: 'unavailable.dynamicQrTitle',
    unavailableDescription: 'unavailable.dynamicQrDescription',
  },
  exportQr: {
    unavailableTitle: 'unavailable.exportQrTitle',
    unavailableDescription: 'unavailable.exportQrDescription',
  },
  staticQr: {
    unavailableTitle: 'unavailable.staticQrTitle',
    unavailableDescription: 'unavailable.staticQrDescription',
  },
  terminals: {
    unavailableTitle: 'unavailable.terminalsTitle',
    unavailableDescription: 'unavailable.terminalsDescription',
  },
  bankAccounts: {
    unavailableTitle: 'unavailable.bankAccountsTitle',
    unavailableDescription: 'unavailable.bankAccountsDescription',
  },
  cashiers: {
    unavailableTitle: 'unavailable.cashiersTitle',
    unavailableDescription: 'unavailable.cashiersDescription',
  },
  devices: {
    unavailableTitle: 'unavailable.devicesTitle',
    unavailableDescription: 'unavailable.devicesDescription',
  },
} as const satisfies Record<
  LiveFeatureRouteName,
  {
    readonly unavailableTitle: keyof MessageCatalog['shell']
    readonly unavailableDescription: keyof MessageCatalog['shell']
  }
>

function LiveFeatureRoute({
  feature,
  children,
  pageTitle,
  pageIcon,
}: {
  feature: LiveFeatureRouteName
  children: ReactNode
  pageTitle?: string
  pageIcon?: ReactNode
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
  const { message } = useMessages('shell')

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
          title={message(presentation.unavailableTitle)}
          description={message(presentation.unavailableDescription)}
        />
      </LiveShell>
    )
  }

  return (
    <LiveShell pageTitle={pageTitle} pageIcon={pageIcon}>
      {children}
    </LiveShell>
  )
}

function DashboardRoute() {
  const { message } = useMessages('shell')
  return (
    <LiveFeatureRoute feature="dashboard" pageTitle={message('navigation.dashboard')}>
      <Suspense fallback={<LoadingState title={message('routes.dashboardLoading')} />}><DashboardReadPage /></Suspense>
    </LiveFeatureRoute>
  )
}

function DynamicQrRoute() {
  const { message } = useMessages('shell')
  const location = useLocation()

  return (
    <LiveFeatureRoute
      feature="dynamicQr"
      pageTitle={message('navigation.dynamicQr')}
      pageIcon={
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <ScanLineIcon className="size-5" aria-hidden="true" />
        </span>
      }
    >
      <Suspense fallback={<LoadingState title={message('routes.dynamicQrLoading')} />}><DynamicQrPage initialState={location.state} /></Suspense>
    </LiveFeatureRoute>
  )
}

function StaticQrRoute() {
  const { message } = useMessages('shell')
  return <LiveFeatureRoute feature="staticQr" pageTitle={message('navigation.staticQr')} pageIcon={
    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft">
      <img src={`${import.meta.env.BASE_URL}qrhub-favicon.svg`} alt="" className="size-5" />
    </span>
  }><Suspense fallback={<LoadingState title={message('routes.staticQrLoading')} />}><StaticQrPage /></Suspense></LiveFeatureRoute>
}

function TerminalRoute() {
  const { message } = useMessages('shell')
  return <LiveFeatureRoute feature="terminals" pageTitle={message('navigation.terminals')} pageIcon={
    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
      <MonitorIcon className="size-5" aria-hidden="true" />
    </span>
  }><Suspense fallback={<LoadingState title={message('routes.terminalsLoading')} />}><TerminalPage /></Suspense></LiveFeatureRoute>
}

function BankAccountRoute() {
  const { message } = useMessages('shell')
  return <LiveFeatureRoute feature="bankAccounts" pageTitle={message('navigation.bankAccounts')} pageIcon={
    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
      <LandmarkIcon className="size-5" aria-hidden="true" />
    </span>
  }><Suspense fallback={<LoadingState title={message('routes.bankAccountsLoading')} />}><BankAccountPage /></Suspense></LiveFeatureRoute>
}

function CashierRoute() {
  const { message } = useMessages('shell')
  return <LiveFeatureRoute feature="cashiers" pageTitle={message('navigation.cashiers')} pageIcon={
    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
      <UsersIcon className="size-5" aria-hidden="true" />
    </span>
  }><Suspense fallback={<LoadingState title={message('routes.cashiersLoading')} />}><CashierPage /></Suspense></LiveFeatureRoute>
}

function CreateCashierRoute() {
  return <Navigate to="/cashiers" replace />
}

function DevicesRoute() {
  const { message } = useMessages('shell')
  return <LiveFeatureRoute feature="devices" pageTitle={message('navigation.devices')}><Suspense fallback={<LoadingState title={message('routes.devicesLoading')} />}><P5Page /></Suspense></LiveFeatureRoute>
}

function CreateQrRoute() {
  const { message } = useMessages('shell')
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
  return <LiveShell><Suspense fallback={<LoadingState title={message('routes.createQrLoading')} />}><CreateQrPage /></Suspense></LiveShell>
}

function ExportQrRoute() {
  const { message } = useMessages('shell')
  return <LiveFeatureRoute feature="exportQr"><Suspense fallback={<LoadingState title={message('routes.exportLoading')} />}><ExportQrPage /></Suspense></LiveFeatureRoute>
}

function ForbiddenRoute() {
  const { message } = useMessages('shell')
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
        title={message('routes.forbidden')}
        description={message('routes.forbiddenDescription')}
      />
    </LiveShell>
  )
}

function LiveNotFoundRoute() {
  const { message } = useMessages('shell')
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
          {message('routes.notFound')}</h1>
        <p className="mt-2 text-text-secondary">
          {message('routes.notFoundDescription')}</p>
        <Link
          to={destination}
          className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          {message('routes.returnSafe')}</Link>
        <div className="mt-4"><LocaleSelect /></div>
      </section>
    </main>
  )
}

export function LiveRouter() {
  return (
    <AppRecoveryBoundary>
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
    </AppRecoveryBoundary>
  )
}
