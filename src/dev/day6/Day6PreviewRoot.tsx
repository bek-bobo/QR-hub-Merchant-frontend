import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { decideLiveFeatureRoute } from '@/app/live-route-policy'
import { useScopedActionRegistry } from '@/app/read/useScopedActionRegistry'
import {
  ReadRuntimeContext,
  type ReadRuntimeContextValue,
} from '@/app/read/useReadRuntime'
import { Button } from '@/components/ui/button'
import { P5Page } from '@/features/p5/P5Page'
import { AccessProvider } from '@/shared/auth/AccessContext'
import { NoAccessState } from '@/shared/ui/AsyncState'
import { Day6AccountPreview } from './Day6AccountPreview'
import {
  createDay6ReadRuntime,
  createDay6Simulator,
  day6ScenarioNames,
  D6_FIXED_INSTANT,
  type Day6Scenario,
  type Day6Simulator,
} from './simulator'

// D6-P5-DEMO-ONLY. Loaded only by the DEV-only lazy route in AppRouter.
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

function DevicesGate({
  simulator,
  children,
}: {
  readonly simulator: Day6Simulator
  readonly children: ReactNode
}) {
  const decision = decideLiveFeatureRoute('devices', {
    sessionPhase: 'authenticated',
    access: simulator.currentState().access,
    registrations: simulator.api.registrations,
  })
  if (decision === 'forbidden') {
    return (
      <NoAccessState description="Bu sintetik profil uchun P5 read ruxsati yo‘q; ro‘yxat so‘rovi yuborilmaydi." />
    )
  }
  if (decision === 'unavailable') {
    return <NoAccessState description="P5 DEV read porti mavjud emas." />
  }
  return children
}

function PreviewExperience({
  scenario,
  revision,
  onScenarioChange,
}: {
  readonly scenario: Day6Scenario
  readonly revision: number
  readonly onScenarioChange: (next: Day6Scenario) => void
}) {
  const queryClient = useQueryClient()
  const [simulator] = useState(() => createDay6Simulator(scenario, revision))
  const snapshot = useSyncExternalStore(
    simulator.subscribe,
    simulator.getSnapshot,
    simulator.getSnapshot,
  )
  const runtime = useMemo(() => createDay6ReadRuntime(simulator), [simulator])
  const actionRegistry = useScopedActionRegistry(snapshot.scope)
  const value = useMemo<ReadRuntimeContextValue>(() => ({
    actionRegistry,
    api: runtime.api,
    scope: snapshot.scope,
    getCurrentScope: simulator.getCurrentScope,
    readiness: {
      auth: { kind: 'configured' },
      ...simulator.api.registrations,
      p5Reset: simulator.resetRegistration,
    },
    capabilities: {
      dashboard: false,
      dynamicQr: false,
      terminalLookup: simulator.has('terminal.lookup'),
      terminalList: false,
      bankAccountList: false,
      cashierList: false,
      merchantLookup: simulator.has('merchant.lookup'),
      bankAccountLookup: false,
      p5List: simulator.has('p5.read'),
      p5ResetPin: simulator.has('p5.resetPin'),
    },
    requiredCapabilities,
    queries: runtime,
  }), [actionRegistry, runtime, simulator, snapshot])

  function changeScenario(next: Day6Scenario) {
    queryClient.clear()
    onScenarioChange(next)
  }

  function invalidateAll() {
    void queryClient.invalidateQueries()
  }

  function replaceSession() {
    simulator.replaceSession()
    queryClient.clear()
  }

  function revokePermission() {
    simulator.revokeResetPermission()
    queryClient.clear()
  }

  function changeParent() {
    simulator.changeParent()
    invalidateAll()
  }

  function loseLookup() {
    simulator.loseLookup()
    invalidateAll()
  }

  function changeTarget() {
    simulator.changeTarget()
    invalidateAll()
  }

  const access = simulator.currentState().access
  const resetReady = simulator.resetRegistration.kind === 'configured'

  return (
    <AccessProvider value={access}>
      <ReadRuntimeContext value={value}>
        <div className="min-h-dvh min-w-0 bg-workspace text-text-primary">
          <header className="border-b border-border bg-brand-soft px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-7xl space-y-3">
              <p className="text-sm font-semibold text-brand">
                D6-P5-DEMO-ONLY · {D6_FIXED_INSTANT}
              </p>
              <h1 className="text-2xl font-semibold">Day 06 P5 preview</h1>
              <p className="text-sm text-text-secondary">
                Sintetik normalized portlar; tarmoq, token, storage va backend yo‘q.
                Production P5 reset gate yopiq qoladi.
              </p>
              <div className="grid gap-3 lg:grid-cols-[minmax(16rem,28rem)_1fr] lg:items-end">
                <label className="space-y-1 text-sm">
                  Scenario
                  <select
                    aria-label="Day 06 scenario"
                    className="block w-full rounded-lg border bg-surface p-2"
                    value={scenario}
                    onChange={(event) => changeScenario(event.target.value as Day6Scenario)}
                  >
                    {day6ScenarioNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <p className="break-words text-xs">
                  Synthetic grants: {snapshot.permissions.join(', ') || 'none'} · reset readiness:{' '}
                  {resetReady ? 'configured' : 'contract blocked'}
                </p>
              </div>
              <nav aria-label="Day 06 preview" className="flex flex-wrap gap-2">
                <NavLink to="/dev/day6/devices" className="rounded-lg border bg-surface px-3 py-2 text-sm hover:bg-muted">
                  P5 qurilmalari
                </NavLink>
                <NavLink to="/dev/day6/account" className="rounded-lg border bg-surface px-3 py-2 text-sm hover:bg-muted">
                  Account wrapping
                </NavLink>
              </nav>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => simulator.resetCounters()}>
                  Reset counters
                </Button>
                {scenario === 'DELAYED_READ' ? (
                  <>
                    <Button type="button" variant="outline" onClick={replaceSession}>
                      Replace read scope
                    </Button>
                    <Button type="button" variant="outline" onClick={() => simulator.releaseRead()}>
                      Release delayed read
                    </Button>
                  </>
                ) : null}
                {scenario === 'PARENT_CHANGED' ? (
                  <Button type="button" variant="outline" onClick={changeParent}>
                    Change merchant options
                  </Button>
                ) : null}
                {scenario === 'LOOKUP_LOST' ? (
                  <Button type="button" variant="outline" onClick={loseLookup}>
                    Lose lookup
                  </Button>
                ) : null}
                {scenario === 'TARGET_CHANGED' ? (
                  <Button type="button" variant="outline" onClick={changeTarget}>
                    Change reset target
                  </Button>
                ) : null}
                {scenario === 'SCOPE_CHANGED' ? (
                  <Button type="button" variant="outline" onClick={replaceSession}>
                    Replace session scope
                  </Button>
                ) : null}
                {scenario === 'PERMISSION_REVOKED' ? (
                  <Button type="button" variant="outline" onClick={revokePermission}>
                    Revoke reset permission
                  </Button>
                ) : null}
                {scenario === 'DELAYED_DOUBLE_SUBMIT' || scenario === 'SCOPE_CHANGED' || scenario === 'PERMISSION_REVOKED' ? (
                  <Button type="button" variant="outline" onClick={() => simulator.releaseMutation()}>
                    Release delayed reset
                  </Button>
                ) : null}
              </div>
              <div
                role="status"
                aria-label="Day 06 request counters"
                className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border bg-surface p-3 text-xs"
              >
                <span>p5List={snapshot.counters.p5List}</span>
                <span>merchantLookup={snapshot.counters.merchantLookup}</span>
                <span>terminalLookup={snapshot.counters.terminalLookup}</span>
                <span>resetPin={snapshot.counters.resetPin}</span>
              </div>
            </div>
          </header>
          <main className="mx-auto min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route index element={<Navigate to="devices" replace />} />
              <Route
                path="devices"
                element={(
                  <DevicesGate simulator={simulator}>
                    <P5Page
                      resetPort={simulator.actionAvailable ? simulator.resetPort : null}
                      resetRegistration={simulator.resetRegistration}
                    />
                  </DevicesGate>
                )}
              />
              <Route path="account" element={<Day6AccountPreview />} />
              <Route path="*" element={<Navigate to="devices" replace />} />
            </Routes>
          </main>
        </div>
      </ReadRuntimeContext>
    </AccessProvider>
  )
}

export default function Day6PreviewRoot() {
  const [scenario, setScenario] = useState<Day6Scenario>('NORMAL')
  const [revision, setRevision] = useState(1)
  return (
    <PreviewExperience
      key={revision}
      scenario={scenario}
      revision={revision}
      onScenarioChange={(next) => {
        setScenario(next)
        setRevision((current) => current + 1)
      }}
    />
  )
}
