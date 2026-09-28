import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { decideLiveFeatureRoute, type LiveFeatureRoute } from '@/app/live-route-policy'
import { useScopedActionRegistry } from '@/app/read/useScopedActionRegistry'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { TerminalPage } from '@/features/terminals/TerminalPage'
import { BankAccountPage } from '@/features/bank-accounts/BankAccountPage'
import { Button } from '@/components/ui/button'
import { AccessProvider } from '@/shared/auth/AccessContext'
import { NoAccessState } from '@/shared/ui/AsyncState'
import { Day5CashierPreview, Day5CreatePreview } from './actions'
import { createDay5ReadRuntime, createDay5Simulator, day5ScenarioNames, D5_FIXED_INSTANT, type Day5Scenario, type Day5Simulator } from './simulator'

// D5-MGMT-DEMO-ONLY. Loaded only by the DEV/demo dynamic route in AppRouter.
const requiredCapabilities = Object.freeze({
  dashboard: 'dashboard.read', dynamicQr: 'dynamicQr.read', terminalLookup: 'terminal.lookup',
  terminalList: 'terminal.read', bankAccountList: 'bankAccount.read', cashierList: 'cashier.read',
  merchantLookup: 'merchant.lookup', bankAccountLookup: 'bankAccount.lookup',
  p5List: 'p5.read',
  p5ResetPin: 'p5.resetPin',
} as const)

function DemoGate({ simulator, feature, children }: { readonly simulator: Day5Simulator; readonly feature: LiveFeatureRoute; readonly children: ReactNode }) {
  const decision = decideLiveFeatureRoute(feature, { sessionPhase: 'authenticated',
    access: simulator.currentState().access, registrations: simulator.api.registrations })
  if (decision === 'forbidden') return <NoAccessState description="Bu sintetik profil uchun aniq ruxsat mavjud emas; so‘rov yuborilmaydi." />
  if (decision === 'unavailable') return <NoAccessState description="Ushbu DEV feature kontrakti hozir mavjud emas." />
  return children
}

function PreviewExperience({ scenario, revision, onScenarioChange }: {
  readonly scenario: Day5Scenario
  readonly revision: number
  readonly onScenarioChange: (next: Day5Scenario) => void
}) {
  const queryClient = useQueryClient()
  const [simulator] = useState(() => createDay5Simulator(scenario, revision))
  const snapshot = useSyncExternalStore(simulator.subscribe, simulator.getSnapshot, simulator.getSnapshot)
  const runtime = useMemo(() => createDay5ReadRuntime(simulator), [simulator])
  const actionRegistry = useScopedActionRegistry(snapshot.scope)
  const value = useMemo<ReadRuntimeContextValue>(() => ({
    actionRegistry, api: runtime.api, scope: snapshot.scope, getCurrentScope: simulator.getCurrentScope,
    readiness: { auth: { kind: 'configured' }, ...simulator.api.registrations, p5Reset: { kind: 'unavailable', reason: 'Not part of Day 05.' } },
    capabilities: {
      dashboard: false, dynamicQr: false,
      terminalLookup: simulator.has('terminal.lookup'), terminalList: simulator.has('terminal.read'),
      bankAccountList: simulator.has('bankAccount.read'), cashierList: simulator.has('cashier.read'),
      merchantLookup: simulator.has('merchant.lookup'), bankAccountLookup: simulator.has('bankAccount.lookup'),
      p5List: false,
      p5ResetPin: false,
    }, requiredCapabilities, queries: runtime,
  }), [actionRegistry, runtime, simulator, snapshot])
  const access = simulator.currentState().access
  const links = [
    { feature: 'terminals', path: '/dev/day5/terminals', label: 'Terminallar' },
    { feature: 'bankAccounts', path: '/dev/day5/bank-accounts', label: 'Bank hisoblari' },
    { feature: 'cashiers', path: '/dev/day5/cashiers', label: 'Kassirlar' },
    { feature: 'cashierCreate', path: '/dev/day5/cashiers/new', label: 'Yangi kassir' },
  ] as const
  function changeScenario(next: Day5Scenario) {
    queryClient.clear()
    onScenarioChange(next)
  }
  function replaceSession() { simulator.replaceSession(); queryClient.clear() }
  function revoke() { simulator.revokePermission('UNASSIGN_TERMINAL'); simulator.revokePermission('ASSIGN_TERMINALS'); simulator.revokePermission('CREATE_CASHIER'); queryClient.clear() }
  function loseLookup() { simulator.loseLookup(); void queryClient.invalidateQueries() }

  return <AccessProvider value={access}><ReadRuntimeContext value={value}>
    <div className="min-h-dvh min-w-0 bg-workspace text-text-primary">
      <header className="border-b border-border bg-brand-soft px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-3">
          <p className="text-sm font-semibold text-brand">D5-MGMT-DEMO-ONLY · {D5_FIXED_INSTANT}</p>
          <h1 className="text-2xl font-semibold">Day 05 management preview</h1>
          <p className="text-sm text-text-secondary">Sintetik portlar; tarmoq, real token va backend yo‘q. Ruxsatlar real rolni anglatmaydi.</p>
          <label className="block max-w-md space-y-1 text-sm">Scenario
            <select aria-label="Day 05 scenario" className="block w-full rounded-lg border bg-surface p-2" value={scenario}
              onChange={(event) => changeScenario(event.target.value as Day5Scenario)}>
              {day5ScenarioNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <p className="break-words text-xs">Synthetic grants: {snapshot.permissions.join(', ') || 'none'}</p>
          <nav aria-label="D5 preview" className="flex flex-wrap gap-2">
            {links.filter((link) => decideLiveFeatureRoute(link.feature, { sessionPhase: 'authenticated', access,
              registrations: simulator.api.registrations }) === 'allowed').map((link) =>
              <NavLink key={link.path} to={link.path} className="rounded-lg border bg-surface px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{link.label}</NavLink>) }
          </nav>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => simulator.resetCounters()}>Reset counters</Button>
            {(scenario === 'SCOPE_CHANGED' || scenario === 'PERMISSION_REVOKED') ? <Button type="button" variant="outline" onClick={scenario === 'SCOPE_CHANGED' ? replaceSession : revoke}>{scenario === 'SCOPE_CHANGED' ? 'Sessionni almashtirish' : 'Action ruxsatini bekor qilish'}</Button> : null}
            {(scenario === 'PARENT_CHANGED' || scenario === 'LOOKUP_LOST') ? <Button type="button" variant="outline" onClick={loseLookup}>Lookupni yo‘qotish</Button> : null}
            {(scenario === 'DELAYED_DOUBLE_SUBMIT' || scenario === 'SCOPE_CHANGED' || scenario === 'PERMISSION_REVOKED') ? <Button type="button" variant="outline" onClick={() => simulator.releaseMutation()}>Kech javobni bo‘shatish</Button> : null}
          </div>
          <div role="status" aria-label="Day 05 request counters" className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg border bg-surface p-3 text-xs">
            {Object.entries(snapshot.counters).map(([name, count]) => <span key={name}>{name}={count}</span>)}
          </div>
        </div>
      </header>
      <main className="mx-auto min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route index element={<Navigate to="terminals" replace />} />
          <Route path="terminals" element={<DemoGate simulator={simulator} feature="terminals"><TerminalPage /></DemoGate>} />
          <Route path="bank-accounts" element={<DemoGate simulator={simulator} feature="bankAccounts"><BankAccountPage /></DemoGate>} />
          <Route path="cashiers" element={<DemoGate simulator={simulator} feature="cashiers"><Day5CashierPreview key={`${snapshot.scope.sessionScopeId}:${snapshot.scope.accessRevision}`} simulator={simulator} /></DemoGate>} />
          <Route path="cashiers/new" element={<DemoGate simulator={simulator} feature="cashierCreate"><Day5CreatePreview key={`${snapshot.scope.sessionScopeId}:${snapshot.scope.accessRevision}`} simulator={simulator} /></DemoGate>} />
        </Routes>
      </main>
    </div>
  </ReadRuntimeContext></AccessProvider>
}

export default function Day5PreviewRoot() {
  const [scenario, setScenario] = useState<Day5Scenario>('NORMAL')
  const [revision, setRevision] = useState(1)
  return <PreviewExperience key={revision} scenario={scenario} revision={revision}
    onScenarioChange={(next) => { setScenario(next); setRevision((current) => current + 1) }} />
}
