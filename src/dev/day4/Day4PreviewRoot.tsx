import { useEffect, useState, useSyncExternalStore } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createCancelQrController } from '@/features/dynamic-qr/cancel-qr'
import { CancelQrConfirmation, CancelQrOutcome } from '@/features/dynamic-qr/CancelQrConfirmation'
import { createCreateQrController } from '@/features/dynamic-qr/create-qr'
import { CreateQrResult } from '@/features/dynamic-qr/CreateQrResult'
import { presentCreateResult } from '@/features/dynamic-qr/create-result'
import { handoffXlsxDownload } from '@/features/dynamic-qr/export-download'
import { StaticQrResults } from '@/features/static-qr/StaticQrResults'
import { applyStaticTerminal, clearStaticTerminal,
  getStaticTerminalState, type StaticQrFilters } from '@/features/static-qr/page-state'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { can } from '@/shared/auth/access'
import { NoAccessState } from '@/shared/ui/AsyncState'
import { actionScenarios, createDemoCancelPort, createDemoExportScenario, createDemoPort,
  d4CancelRow, d4Currency, d4ExportQuery, d4Scope, d4StaticTerminal,
  d4Terminal, demoAccess, demoProfiles, D4_FIXED_INSTANT, profileForAction, staticDemoPage, staticScenarios,
  type ActionScenario, type StaticScenario } from './scenarios'

// D4-ACTIONS-DEMO-ONLY. The entire route is loaded only through the DEV/demo boundary.
function changePreviewStaticPageSize(current: StaticQrFilters, rawSize: string): StaticQrFilters {
  if (rawSize !== '10' && rawSize !== '25' && rawSize !== '50') throw new Error('Unsupported preview page size.')
  const size = rawSize === '25' ? 25 : rawSize === '50' ? 50 : 10
  return { ...current, page: 0, size }
}

function CreateScenarioView({ scenario }: { readonly scenario: ActionScenario }) {
  const [demo] = useState(() => {
    let dispatches = 0
    const allowed = can(demoAccess(profileForAction(scenario)), 'dynamicQr.create', true)
    const port = createDemoPort(scenario, () => { dispatches++ })
    const controller = createCreateQrController({
      currentScope: () => d4Scope, canCreate: () => allowed, port: () => port,
    })
    return { controller, allowed, dispatches: () => dispatches }
  })
  const state = useSyncExternalStore(demo.controller.subscribe, demo.controller.getState, demo.controller.getState)
  const result = presentCreateResult(state,
    scenario === 'CREATE_CONFIRMED_SAFE_LINK' ? ['https:'] : [])

  if (!demo.allowed) return <NoAccessState description="Sintetik profilda create ruxsati yo‘q; fake dispatch 0." />
  return <div className="space-y-3">
    <p className="text-sm">D4 terminal · 1 000,00 UZS · UZS kodi faqat fake portda qo‘llanadi.</p>
    <Button type="button" disabled={state.outcome.kind === 'pending'} onClick={() => void demo.controller.submit({
      draft: { terminalId: d4Terminal.id, amountInput: '1000', currencyCode: 'UZS' },
      terminals: [d4Terminal], currencies: [d4Currency], terminalLookupAllowed: true,
      currencyLookupAllowed: true,
    })}>Fake QR yaratish</Button>
    <p className="text-xs" role="status">Fake dispatch: {demo.dispatches()}</p>
    {result ? <CreateQrResult result={result} currentScope={() => d4Scope}
      canCreate={() => demo.allowed} onClose={demo.controller.closeResult}
      onNewIntent={() => { demo.controller.beginNewIntent() }} /> : null}
  </div>
}

function ExportScenarioView({ scenario }: { readonly scenario: ActionScenario }) {
  const allowed = can(demoAccess(profileForAction(scenario)), 'dynamicQr.export', true)
  const [demo] = useState(() => createDemoExportScenario(scenario, handoffXlsxDownload))
  const [message, setMessage] = useState('Hali so‘rov yuborilmadi.')
  const [pending, setPending] = useState(false)
  const [revision, setRevision] = useState(1)
  useEffect(() => () => demo.invalidate(), [demo])
  async function run() {
    setPending(true)
    setMessage('Fake XLSX tayyorlanmoqda.')
    const result = await demo.run()
    setPending(false)
    setMessage(result === 'handed-off' ? 'XLSX yuklab olish brauzerga topshirildi.'
      : result === 'failed' ? 'XLSX yuklab bo‘lmadi.'
        : result === 'stale' ? 'Eski scope natijasi yuklab olinmadi.' : 'So‘rov yuborilmadi.')
  }
  return <div className="space-y-3">
    <p className="text-sm">Qo‘llangan filtrlar: {d4ExportQuery.fromDate} – {d4ExportQuery.toDate}. Access revision: {revision}.</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={pending || !allowed} onClick={() => void run()}>Fake XLSX eksport</Button>
      {scenario === 'EXPORT_STALE' ? <Button type="button" variant="outline"
        disabled={!pending} onClick={() => { demo.changeAccessRevision(); setRevision(2) }}>
        Access revisionni almashtirish
      </Button> : null}
    </div>
    <p role="status" className="text-sm">{message}</p>
    <p className="text-xs text-text-secondary">Fayl lokal, tarmoq so‘rovi yo‘q; xavfsiz fallback nomi dynamic-qrs.xlsx.</p>
  </div>
}

function CancelScenarioView({ scenario }: { readonly scenario: ActionScenario }) {
  const [demo] = useState(() => {
    let dispatches = 0
    let scope: ReadScope = d4Scope
    let allowed = can(demoAccess(profileForAction(scenario)), 'dynamicQr.cancel', true)
    let releaseLate: () => void = () => undefined
    const late = new Promise<void>((resolve) => { releaseLate = resolve })
    const port = createDemoCancelPort(scenario, () => { dispatches++ },
      scenario === 'CANCEL_PERMISSION_LOST' ? late : undefined)
    const controller = createCancelQrController({
      currentScope: () => scope, canCancel: () => allowed,
      eligibleRow: () => true, port: () => port,
    })
    return { controller, dispatches: () => dispatches,
      losePermission: () => {
        allowed = false
        scope = { ...scope, accessRevision: scope.accessRevision + 1 }
        controller.invalidate()
        releaseLate()
      } }
  })
  const state = useSyncExternalStore(demo.controller.subscribe, demo.controller.getState, demo.controller.getState)
  const [lost, setLost] = useState(false)
  return <div className="space-y-3">
    <p className="break-all text-sm">Fake QR ID: {d4CancelRow.pkey}. Eligibility faqat shu fake kompozitsiyada ochiq.</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={state.outcome.kind !== 'idle'}
        onClick={() => { demo.controller.request(d4CancelRow) }}>Bekor qilishni ko‘rib chiqish</Button>
      {scenario === 'CANCEL_PERMISSION_LOST' ? <Button type="button" variant="outline"
        disabled={state.outcome.kind !== 'pending' || lost}
        onClick={() => { demo.losePermission(); setLost(true) }}>Ruxsatni yo‘qotish</Button> : null}
    </div>
    <CancelQrConfirmation state={state} onDismiss={demo.controller.dismiss}
      onConfirm={() => { void demo.controller.confirm() }} />
    <CancelQrOutcome outcome={state.outcome} refresh={state.refresh} />
    {lost ? <p role="status">Ruxsat va access revision o‘zgardi; kech natija ko‘rsatilmaydi.</p> : null}
    <p className="text-xs" role="status">Fake dispatch: {demo.dispatches()}</p>
  </div>
}

function ActionPreview() {
  const [scenario, setScenario] = useState<ActionScenario>('CREATE_CONFIRMED_SAFE_LINK')
  const profile = profileForAction(scenario)
  return <div className="space-y-4">
    <h2 className="text-2xl font-semibold">D4 action preview</h2>
    <label className="block space-y-1 text-sm">Scenario
      <select className="block w-full rounded-lg border bg-surface p-2 sm:w-auto"
        value={scenario} onChange={(event) => setScenario(event.target.value as ActionScenario)}>
        {actionScenarios.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
    </label>
    <p className="text-xs">Sintetik capability profili: {profile} ({demoProfiles[profile].join(', ') || 'none'}). Real rol emas.</p>
    <Card><CardHeader><CardTitle>{scenario}</CardTitle></CardHeader><CardContent>
      <div key={scenario}>{scenario.startsWith('CREATE_') ? <CreateScenarioView scenario={scenario} />
        : scenario.startsWith('EXPORT_') ? <ExportScenarioView scenario={scenario} />
          : <CancelScenarioView scenario={scenario} />}</div>
    </CardContent></Card>
  </div>
}

function StaticPreview() {
  const [scenario, setScenario] = useState<StaticScenario>('STATIC_NORMAL')
  return <div className="space-y-4">
    <h2 className="text-2xl font-semibold">D4 static QR preview</h2>
    <label className="block space-y-1 text-sm">Scenario
      <select className="block w-full rounded-lg border bg-surface p-2 sm:w-auto"
        value={scenario} onChange={(event) => setScenario(event.target.value as StaticScenario)}>
        {staticScenarios.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
    </label>
    <p className="text-xs">Sintetik capability profili: STATIC_ONLY. Real rol emas.</p>
    <StaticScenarioView key={scenario} scenario={scenario} />
  </div>
}

function StaticScenarioView({ scenario }: { readonly scenario: StaticScenario }) {
  const [filters, setFilters] = useState<StaticQrFilters>(() => scenario === 'STATIC_TERMINAL_LOST'
    ? { terminalId: d4StaticTerminal.id, page: 0, size: 10 } : { page: 0, size: 10 })
  const [draft, setDraft] = useState(filters.terminalId ?? '')
  const [lookupAvailable, setLookupAvailable] = useState(scenario !== 'STATIC_LOOKUP_DENIED')
  const lookup = { enabled: lookupAvailable, pending: false, error: false,
    terminals: lookupAvailable ? [d4StaticTerminal] : undefined }
  const confirmed = getStaticTerminalState(filters, lookup) === 'valid'
  const data = scenario === 'STATIC_ERROR' ? undefined : staticDemoPage(scenario, filters.page, filters.size)
  return <Card><CardHeader><CardTitle>{scenario}</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm">QR ko‘rinishi kontrakt tasdiqlangach mavjud bo‘ladi. Status kodi xom raqam.</p>
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="text-sm">Terminal
        <select className="block rounded-lg border bg-surface p-2" disabled={!lookupAvailable}
          value={draft} onChange={(event) => setDraft(event.target.value)}>
          <option value="">Barcha terminallar</option>
          {lookupAvailable ? <option value={d4StaticTerminal.id}>{d4StaticTerminal.name}</option> : null}
        </select>
      </label>
      <Button type="button" disabled={Boolean(draft) && !lookupAvailable}
        onClick={() => { const next = applyStaticTerminal(filters, draft, lookup); if (next) setFilters(next) }}>Qo‘llash</Button>
      <Button type="button" variant="outline" onClick={() => { setDraft(''); setFilters(clearStaticTerminal(filters)) }}>Tozalash</Button>
      <label className="text-sm">Sahifa hajmi
        <select className="block rounded-lg border bg-surface p-2" value={filters.size}
          onChange={(event) => setFilters(changePreviewStaticPageSize(filters, event.target.value))}>
          <option value="10">10</option><option value="25">25</option><option value="50">50</option>
        </select>
      </label>
      {scenario === 'STATIC_TERMINAL_LOST' ? <Button type="button" variant="outline"
        disabled={!lookupAvailable} onClick={() => setLookupAvailable(false)}>Terminal tasdig‘ini yo‘qotish</Button> : null}
    </div>
    {!lookupAvailable ? <p role="status" className="text-sm">Terminal lookup mavjud emas; qo‘llangan filtr avtomatik tozalanmaydi.</p> : null}
    <StaticQrResults terminalConfirmed={confirmed} pending={false} error={scenario === 'STATIC_ERROR'}
      data={data} page={filters.page} onRetry={() => undefined}
      onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />
  </CardContent></Card>
}

export default function Day4PreviewRoot() {
  return <div className="min-h-dvh bg-workspace px-4 py-6 text-text-primary sm:px-6">
    <div className="mx-auto max-w-7xl space-y-5">
      <header><p className="text-sm font-semibold text-brand">D4-ACTIONS-DEMO-ONLY</p>
        <h1 className="text-2xl font-semibold">Day 04 development simulator</h1>
        <p className="text-sm">Faqat lokal fake portlar; real backendga so‘rov yo‘q. Fixed clock: {D4_FIXED_INSTANT}.</p>
      </header>
      <nav aria-label="D4 preview" className="flex flex-wrap gap-3 text-sm">
        <NavLink to="/dev/day4/actions">Action senariylari</NavLink>
        <NavLink to="/dev/day4/static-qrs">Statik QR senariylari</NavLink>
      </nav>
      <main><Routes><Route index element={<Navigate to="actions" replace />} />
        <Route path="actions" element={<ActionPreview />} />
        <Route path="static-qrs" element={<StaticPreview />} /></Routes></main>
    </div>
  </div>
}
