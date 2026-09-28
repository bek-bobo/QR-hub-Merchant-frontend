import { useMemo, useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router'
import { createReadRuntime } from '@/app/read/read-runtime'
import { useScopedActionRegistry } from '@/app/read/useScopedActionRegistry'
import {
  ReadRuntimeContext,
  type ReadRuntimeContextValue,
} from '@/app/read/useReadRuntime'
import { Button } from '@/components/ui/button'
import { DashboardReadPage } from '@/features/dashboard/DashboardReadPage'
import { DynamicQrPage } from '@/features/dynamic-qr/DynamicQrPage'
import { can } from '@/shared/auth/access'
import { AccessProvider } from '@/shared/auth/AccessContext'
import { D3_READ_FIXED_INSTANT } from './read.fixture'
import {
  createReadSimulator,
  type ReadPreviewScenario,
} from './read-simulator'

const requiredCapabilities = Object.freeze({
  dashboard: 'dashboard.read',
  dynamicQr: 'dynamicQr.read',
  terminalLookup: 'terminal.lookup',
  terminalList: 'terminal.read',
  bankAccountList: 'bankAccount.read',
  cashierList: 'cashier.read',
  merchantLookup: 'merchant.lookup',
  bankAccountLookup: 'bankAccount.lookup',
  p5List: 'p5.read',
  p5ResetPin: 'p5.resetPin',
} as const)

const scenarioNames = [
  'RECONCILED',
  'AMOUNT_MISMATCH',
  'NORMAL',
  'EMPTY',
  'DELAYED',
  'ERROR',
  'DASHBOARD_ONLY',
  'LIST_ONLY',
  'LOOKUP_DENIED',
  'ALL_DENIED',
  'UNKNOWN_STATUS',
  'NULLABLE_GROWTH',
  'ZERO_CHART',
] as const satisfies readonly ReadPreviewScenario[]

function readinessLabel(
  registration: ReadRuntimeContextValue['readiness']['dashboard'],
) {
  return registration.kind === 'configured' ? 'configured' : 'unavailable'
}

function ReadPreviewExperience({
  scenario,
  scopeRevision,
  onScenarioChange,
}: {
  readonly scenario: ReadPreviewScenario
  readonly scopeRevision: number
  readonly onScenarioChange: (scenario: ReadPreviewScenario) => void
}) {
  const queryClient = useQueryClient()
  const simulator = useMemo(
    () => createReadSimulator(scenario, scopeRevision),
    [scenario, scopeRevision],
  )
  const actionRegistry = useScopedActionRegistry(simulator.scope)
  const runtime = useMemo(
    () =>
      createReadRuntime(simulator.api, () => ({
        scope: simulator.scope,
        access: simulator.access,
      })),
    [simulator],
  )
  const snapshot = useSyncExternalStore(
    simulator.subscribe,
    simulator.getSnapshot,
    simulator.getSnapshot,
  )
  const value = useMemo<ReadRuntimeContextValue>(
    () => ({
      actionRegistry,
      api: runtime.api,
      scope: simulator.scope,
      getCurrentScope: () => simulator.scope,
      readiness: {
        auth: { kind: 'configured' },
        ...simulator.registrations,
        p5Reset: { kind: 'unavailable', reason: 'Not part of Day 03.' },
      },
      capabilities: {
        dashboard: can(simulator.access, 'dashboard.read', false),
        dynamicQr: can(simulator.access, 'dynamicQr.read', false),
        terminalLookup: can(simulator.access, 'terminal.lookup', false),
        terminalList: false,
        bankAccountList: false,
        cashierList: false,
        merchantLookup: false,
        bankAccountLookup: false,
        p5List: false,
        p5ResetPin: false,
      },
      requiredCapabilities,
      queries: runtime,
    }),
    [actionRegistry, runtime, simulator],
  )

  function resetCounters() {
    simulator.resetCounters()
  }

  function selectScenario(next: ReadPreviewScenario) {
    queryClient.clear()
    onScenarioChange(next)
  }

  return (
    <AccessProvider value={simulator.access}>
      <ReadRuntimeContext value={value}>
        <div className="min-h-dvh min-w-0 bg-workspace text-text-primary">
          <section
            aria-label="D3 read development preview controls"
            className="border-b border-border bg-brand-soft px-4 py-4 sm:px-6"
          >
            <div className="mx-auto max-w-7xl space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand">
                    D3 read development preview
                  </p>
                  <p className="text-xs text-text-secondary">
                    D3-READ-DEMO-ONLY · {simulator.profile.fullname} · fixed 2026-09-15 Tashkent business date
                  </p>
                </div>
                <label className="text-sm font-medium text-text-primary">
                  Scenario
                  <select
                    value={scenario}
                    onChange={(event) =>
                      selectScenario(
                        scenarioNames.find(
                          (name) => name === event.target.value,
                        ) ?? 'NORMAL',
                      )
                    }
                    className="ml-2 h-9 rounded-lg border border-input bg-surface px-3 text-sm"
                  >
                    {scenarioNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border bg-surface p-3">
                  <p className="font-semibold">Current scenario</p>
                  <p className="mt-1 text-text-secondary">{scenario}</p>
                </div>
                <div className="rounded-lg border bg-surface p-3">
                  <p className="font-semibold">Permissions</p>
                  <p className="mt-1 break-words text-text-secondary">
                    {simulator.permissions.join(', ') || 'none'}
                  </p>
                </div>
                <div className="rounded-lg border bg-surface p-3">
                  <p className="font-semibold">Readiness</p>
                  <p className="mt-1 text-text-secondary">
                    dashboard={readinessLabel(value.readiness.dashboard)} · list={readinessLabel(value.readiness.dynamicQr)} · lookup={readinessLabel(value.readiness.terminalLookup)}
                  </p>
                </div>
                <div className="rounded-lg border bg-surface p-3">
                  <p className="font-semibold">Request counters</p>
                  <p className="mt-1 text-text-secondary">
                    dashboard={snapshot.counters.dashboard} · dynamicQr={snapshot.counters.dynamicQr} · terminalLookup={snapshot.counters.terminalLookup}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={resetCounters}
                  >
                    Reset counters
                  </Button>
                </div>
              </div>

              <nav className="flex flex-wrap gap-2" aria-label="D3 read preview navigation">
                <NavLink
                  to="/dev/read/dashboard"
                  className="rounded-lg border bg-surface px-3 py-2 text-sm font-medium"
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/dev/read/dynamic-qrs"
                  className="rounded-lg border bg-surface px-3 py-2 text-sm font-medium"
                >
                  Dynamic QR
                </NavLink>
              </nav>
            </div>
          </section>

          <main className="mx-auto min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route
                path="dashboard"
                element={
                  <DashboardReadPage
                    initialInstant={D3_READ_FIXED_INSTANT}
                    dynamicQrPath="/dev/read/dynamic-qrs"
                  />
                }
              />
              <Route
                path="dynamic-qrs"
                element={<DynamicQrPreviewRoute />}
              />
            </Routes>
          </main>
        </div>
      </ReadRuntimeContext>
    </AccessProvider>
  )
}

function DynamicQrPreviewRoute() {
  const location = useLocation()
  return (
    <DynamicQrPage
      initialState={location.state}
      initialInstant={D3_READ_FIXED_INSTANT}
    />
  )
}

export default function ReadPreviewRoot() {
  const [scenario, setScenario] = useState<ReadPreviewScenario>('NORMAL')
  const [scopeRevision, setScopeRevision] = useState(1)

  function changeScenario(next: ReadPreviewScenario) {
    setScenario(next)
    setScopeRevision((revision) => revision + 1)
  }

  return (
    <ReadPreviewExperience
      key={scopeRevision}
      scenario={scenario}
      scopeRevision={scopeRevision}
      onScenarioChange={changeScenario}
    />
  )
}
