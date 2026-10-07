// @vitest-environment happy-dom
import { act, StrictMode, type ComponentProps, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { notifyManager, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DynamicQrPage } from '@/features/dynamic-qr/DynamicQrPage'
import { ExportQrPage } from '@/features/dynamic-qr/ExportQrPage'
import { StaticQrPage } from '@/features/static-qr/StaticQrPage'
import { TerminalPage } from '@/features/terminals/TerminalPage'
import { BankAccountPage } from '@/features/bank-accounts/BankAccountPage'
import { P5Page } from '@/features/p5/P5Page'
import type { DynamicQrFilters, PageSize } from '@/shared/contracts/merchant-read'
import type { ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { useDynamicQrFilterLookups } from '@/features/dynamic-qr/filter-lookups'
import { toDynamicQrExportQuery } from '@/features/dynamic-qr/export-filters'

type Filters = { search: string; page: number; size: PageSize; merchantId?: string; fromDate?: string; toDate?: string }
const bridge = vi.hoisted(() => ({ runtime: null as ReadRuntimeContextValue | null,
  applied: null as Filters | null, draftMerchant: undefined as string | undefined,
  edit: null as ((id?: string) => void) | null, search: null as ((text: string) => void) | null,
  page: null as ((page: number) => void) | null, size: null as ((size: PageSize) => void) | null,
  bank: null as ((id?: string) => void) | null, terminal: null as ((id?: string) => void) | null,
  terminalLookupArgs: vi.fn(),
  extra: null as ((key: string) => void) | null, draftExtra: {} as Record<string, unknown>,
  date: null as ((range: { fromDate: string; toDate: string }) => void) | null,
  dateReset: null as (() => void) | null,
  requests: vi.fn(), lookups: vi.fn(), exports: vi.fn(), invalid: false }))
vi.mock('@/app/read/useReadRuntime', () => ({ useReadRuntime: () => bridge.runtime }))
vi.mock('@/shared/auth/useAccessContext', () => ({ useAccessContext: () => ({ kind: 'authenticated', permissions: new Set(['GET_STATIC_QRS', 'GET_DYNAMIC_QRS']) }) }))
vi.mock('@/shared/api/ProtectedReadContext', () => ({ useProtectedReadContext: () => ({ bridge: {}, getSessionSnapshot: vi.fn() }) }))
vi.mock('@/shared/api/http', async (original) => ({ ...await original<typeof import('@/shared/api/http')>(),
  validateWebBaseUrl: () => ({ kind: 'valid', value: 'https://web.example.test' }), createHttpTransport: () => ({}) }))
vi.mock('@/features/static-qr/query', () => ({ createStaticQrQueryOptions: ({ filters }: { filters: Filters }) => listOptions(filters) }))
vi.mock('@/features/dynamic-qr/queries', () => ({ useDynamicQrReadQueries: (applied: DynamicQrFilters, draft: DynamicQrFilters) => {
  const lookups = useDynamicQrFilterLookups(draft, applied)
  const list = useQuery(listOptions(applied))
  return { runtime: bridge.runtime, list, stats: {}, statsFeatureEnabled: false,
    filterState: bridge.invalid ? 'invalid' : lookups.appliedFilterState, enabled: { list: true, stats: false }, lookups }
} }))
function listOptions(filters: Filters) {
  bridge.applied = filters
  return { queryKey: ['drawer-list', filters], enabled: true, queryFn: async () => {
    bridge.requests({ ...filters })
    return { content: [], page: filters.page, size: filters.size, totalPages: 10, totalElements: 200 }
  } }
}
function field(id: string | undefined, change: (id?: string) => void) {
  bridge.draftMerchant = id; bridge.edit = change
  return <output data-testid="draft">{id ?? 'empty'}</output>
}
function quick({ searchDraft, onDraftChange }: { searchDraft: string; onDraftChange: (text: string) => void }) {
  bridge.search = onDraftChange
  return <input aria-label="Search" value={searchDraft} onChange={(event) => onDraftChange(event.target.value)} />
}
vi.mock('@/features/dynamic-qr/DynamicQrAdvancedFilterFields', () => ({
  DynamicQrAdvancedFilterFields: (props: ComponentProps<typeof import('@/features/dynamic-qr/DynamicQrAdvancedFilterFields').DynamicQrAdvancedFilterFields>) => {
    bridge.bank = props.onBankAccountChange; bridge.terminal = props.onTerminalChange
    bridge.draftExtra = { bankAccountId: props.bankAccountId, terminalId: props.terminalId, status: props.status, distributionStatus: props.distributionStatus }
    bridge.extra = (key) => {
      if (key === 'bankAccountId') props.onBankAccountChange('1')
      if (key === 'terminalId') props.onTerminalChange('1')
      if (key === 'status') props.onStatusChange(0)
      if (key === 'distributionStatus') props.onDistributionStatusChange(0)
    }
    return field(props.merchantId, props.onMerchantChange)
  },
}))
vi.mock('@/features/dynamic-qr/DynamicQrQuickFilters', () => ({ DynamicQrQuickFilters: (props: { searchDraft: string; onSearchDraftChange: (text: string) => void; onRangeApply: (range: { fromDate: string; toDate: string }) => void; onRangeReset: () => void }) => {
  bridge.date = props.onRangeApply
  bridge.dateReset = props.onRangeReset
  return quick({ searchDraft: props.searchDraft, onDraftChange: props.onSearchDraftChange })
} }))
vi.mock('@/features/static-qr/StaticQrFilterControls', () => ({ StaticQrQuickSearch: quick,
  StaticQrAdvancedFilterFields: (props: ComponentProps<typeof import('@/features/static-qr/StaticQrFilterControls').StaticQrAdvancedFilterFields>) => {
    bridge.draftExtra = { ...props.draft }
    bridge.extra = (key) => props.onChange({ ...props.draft, [key]: '1' })
    return field(props.draft.merchantId, (merchantId) => props.onChange({ ...props.draft, merchantId, terminalId: undefined }))
  },
}))
vi.mock('@/features/terminals/TerminalFilterControls', () => ({ TerminalQuickSearch: quick,
  TerminalAdvancedFilterFields: (props: ComponentProps<typeof import('@/features/terminals/TerminalFilterControls').TerminalAdvancedFilterFields>) => {
    bridge.draftExtra = { ...props.draft }
    bridge.extra = (key) => props.onChange({ ...props.draft, [key]: '1' })
    return field(props.draft.merchantId, (merchantId) => props.onChange({ ...props.draft, merchantId, bankAccountId: undefined }))
  },
}))
vi.mock('@/features/bank-accounts/BankAccountFilterControls', () => ({ BankAccountQuickSearch: quick,
  BankAccountMerchantFilter: (props: ComponentProps<typeof import('@/features/bank-accounts/BankAccountFilterControls').BankAccountMerchantFilter>) => field(props.merchantId, props.onChange),
}))
vi.mock('@/features/p5/P5FilterControls', () => ({ P5QuickSearch: quick,
  P5AdvancedFilterFields: (props: ComponentProps<typeof import('@/features/p5/P5FilterControls').P5AdvancedFilterFields>) => {
    bridge.draftExtra = { ...props.draft }
    bridge.extra = (key) => props.onChange({ ...props.draft, [key]: key === 'statusDraft' ? { mode: 'custom', code: '777' } : '1' })
    return field(props.draft.merchantId, (merchantId) => props.onChange({ ...props.draft, merchantId, terminalId: undefined }))
  },
}))
function results(props: { quickFilters?: ReactNode; headerActions?: ReactNode; onPageChange: (page: number) => void; onPageSizeChange: (size: PageSize) => void }) {
  bridge.page = props.onPageChange; bridge.size = props.onPageSizeChange
  return <>{props.quickFilters}{props.headerActions}</>
}
vi.mock('@/features/static-qr/StaticQrResults', () => ({ StaticQrResults: results }))
vi.mock('@/features/terminals/TerminalResults', () => ({ TerminalResults: results }))
vi.mock('@/features/bank-accounts/BankAccountResults', () => ({ BankAccountResults: results }))
vi.mock('@/features/p5/P5Results', () => ({ P5Results: results }))
vi.mock('@/shared/ui/PaginationBar', () => ({ PaginationBar: (props: { onPageChange: (page: number) => void; onPageSizeChange: (size: PageSize) => void }) => {
  bridge.page = props.onPageChange; bridge.size = props.onPageSizeChange; return null
} }))
vi.mock('@/features/dynamic-qr/ExportButton', () => ({ ExportButton: ({ applied }: { applied: DynamicQrFilters }) => {
  bridge.applied = applied
  return <button data-testid="export" onClick={() => bridge.exports(toDynamicQrExportQuery(applied))}>Export</button>
} }))
vi.mock('@/features/dynamic-qr/CreateQrDialog', () => ({ CreateQrDialog: () => null }))
vi.mock('@/shared/ui/TableColumnPreferences', () => ({ TableColumnPreferences: () => null }))

let root: Root
let host: HTMLElement
let client: QueryClient
beforeEach(() => {
  vi.useFakeTimers(); bridge.requests.mockClear(); bridge.lookups.mockClear(); bridge.exports.mockClear(); bridge.invalid = false; bridge.terminalLookupArgs.mockClear()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  notifyManager.setScheduler(queueMicrotask)
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } })
  const options = [{ id: '1', name: 'One' }, { id: '2', name: 'Two' }]
  function lookup(name: string, parent?: string) {
    const queryKey = ['drawer-lookup', name, parent ?? '']
    if (!client.getQueryData(queryKey) && (!parent || parent === '1')) client.setQueryData(queryKey, options)
    return { queryKey, enabled: true, queryFn: async () => { bridge.lookups(name, parent); return options } }
  }
  const scope = { source: 'live', sessionScopeId: 'drawer', accessRevision: 1 }
  bridge.runtime = { scope, getCurrentScope: () => scope,
    readiness: { auth: { kind: 'configured' }, dynamicQr: { kind: 'configured' }, terminalList: { kind: 'configured' }, bankAccountList: { kind: 'configured' }, p5List: { kind: 'configured' }, p5Reset: { kind: 'configured' } },
    capabilities: { dynamicQr: true, terminalList: true, bankAccountList: true, p5List: true, merchantLookup: true, terminalLookup: true, p5ResetPin: false }, queries: {
      merchantLookupOptions: () => lookup('merchant'), regionLookupOptions: () => lookup('region'),
      bankAccountLookupOptions: (parent?: string) => lookup('bank', parent), districtLookupOptions: (parent?: string) => lookup('district', parent),
      terminalLookupOptions: (...args: [string?]) => { bridge.terminalLookupArgs(args); return lookup('terminal', args[0]) }, terminalOptions: () => lookup('terminal'),
      terminalListOptions: listOptions, bankAccountListOptions: listOptions, p5ListOptions: listOptions,
    } } as unknown as ReadRuntimeContextValue
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); client.clear(); vi.useRealTimers()
  notifyManager.setScheduler((callback) => setTimeout(callback, 0))
})
async function click(text: string) {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((node) => node.textContent?.trim() === text)
  expect(button, `Expected ${text}`).toBeDefined()
  await act(async () => button!.click())
  await act(async () => vi.advanceTimersByTimeAsync(0))
}
async function edit(id?: string) { await act(async () => bridge.edit!(id)) }
async function search(text: string) { await act(async () => bridge.search!(text)) }
async function advance(ms: number) { await act(async () => vi.advanceTimersByTimeAsync(ms)) }
async function dismiss(path: string) {
  if (path === 'X') await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Filtrlarni yopish"]')!.click())
  else if (path === 'Escape') await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  else await act(async () => {
    const overlay = document.querySelector<HTMLElement>('[data-slot="sheet-overlay"]')!
    overlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 }))
    overlay.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse', button: 0 }))
    overlay.click()
  })
  await advance(0)
  expect(document.querySelector('[data-slot="sheet-content"][data-state="open"]')).toBeNull()
}
const domains = [
  ['Dynamic QR', DynamicQrPage], ['Static QR', StaticQrPage], ['Terminals', TerminalPage],
  ['Bank accounts', BankAccountPage], ['P5', P5Page], ['Export', ExportQrPage],
] as const

describe.each(domains)('%s drawer ownership', (name, Page) => {
  async function mount(strict = false) {
    const content = <QueryClientProvider client={client}><Page /></QueryClientProvider>
    await act(async () => root.render(strict ? <StrictMode>{content}</StrictMode> : content))
    await search('  abc  '); await advance(400)
    if (name === 'Dynamic QR' || name === 'Export') await act(async () => bridge.date!({ fromDate: '2026-09-01', toDate: '2026-09-15' }))
    await click('Filtrlar'); await edit('1'); await click('Qo‘llash')
    expect(bridge.applied!.merchantId).toBe('1')
    if (name !== 'Export') {
      await act(async () => bridge.size!(50)); await act(async () => bridge.page!(3))
    }
  }
  it.each([false, true])('resyncs open/dismiss/reopen and Reset applies atomically, StrictMode=%s', async (strict) => {
    await mount(strict)
    const committed = { ...bridge.applied! }
    const calls = bridge.requests.mock.calls.length
    await click('Filtrlar'); expect(bridge.draftMerchant).toBe('1')
    await edit('2'); expect(bridge.applied).toEqual(committed)
    if (name !== 'Bank accounts') expect(bridge.lookups.mock.calls.some((call) => call[1] === '2')).toBe(true)
    await dismiss('X'); expect(bridge.applied).toEqual(committed)
    await click('Filtrlar'); expect(bridge.draftMerchant).toBe('1')
    await click('Qayta tiklash'); expect(bridge.draftMerchant).toBeUndefined()
    expect(bridge.applied).toEqual(committed)
    expect(bridge.requests).toHaveBeenCalledTimes(calls)
    expect(document.querySelector('[data-slot="sheet-content"]')).not.toBeNull()
    await click('Qo‘llash')
    expect(bridge.applied).toMatchObject({ search: '  abc  ', page: 0, size: committed.size })
    expect(bridge.applied!.merchantId).toBeUndefined()
    expect(bridge.applied!.fromDate).toBe(committed.fromDate)
    expect(bridge.applied!.toDate).toBe(committed.toDate)
    expect(bridge.requests.mock.calls.slice(calls).map((call) => call[0])).toEqual(name === 'Export' ? [] : [bridge.applied])
  })
  if (name !== 'Bank accounts') it('resets every populated structured field only after Apply', async () => {
    await mount(); await click('Filtrlar')
    const keys = name === 'P5' ? ['terminalId', 'statusDraft'] : name === 'Terminals'
      ? ['bankAccountId', 'regionId', 'districtId'] : name === 'Static QR'
        ? ['terminalId', 'regionId', 'districtId'] : ['bankAccountId', 'terminalId', 'status', 'distributionStatus']
    for (const key of keys) await act(async () => bridge.extra!(key))
    await click('Qo‘llash')
    for (const key of keys) expect(key === 'statusDraft' ? (bridge.applied as unknown as { status: number }).status : (bridge.applied as unknown as Record<string, unknown>)[key]).toBe(key === 'statusDraft' ? 777 : key.includes('Status') || key === 'status' ? 0 : '1')
    const committed = { ...bridge.applied! }
    await click('Filtrlar'); await click('Qayta tiklash')
    expect(bridge.applied).toEqual(committed)
    for (const key of keys) {
      if (key === 'statusDraft') expect(bridge.draftExtra[key]).toEqual({ mode: 'all', code: '' })
      else expect(bridge.draftExtra[key]).toBeUndefined()
    }
    await click('Qo‘llash')
    for (const key of keys) expect((bridge.applied as unknown as Record<string, unknown>)[key === 'statusDraft' ? 'status' : key]).toBeUndefined()
  })
  it.each(['Escape', 'overlay'])('discards unsaved edits on %s and restores current committed draft', async (path) => {
    await mount(); const committed = { ...bridge.applied! }
    await click('Filtrlar'); await edit('2'); await dismiss(path)
    expect(bridge.applied).toEqual(committed)
    await click('Filtrlar'); expect(bridge.draftMerchant).toBe('1')
  })
  it('Reset/Apply/dismiss never flush or erase pending Search', async () => {
    await mount(); await search('  next!  '); await advance(200)
    await click('Filtrlar'); await edit('2'); await dismiss('X')
    await click('Filtrlar'); await click('Qayta tiklash'); await click('Qo‘llash')
    expect(bridge.applied!.search).toBe('  abc  ')
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Search"]')!.value).toBe('  next!  ')
    await advance(199); expect(bridge.applied!.search).toBe('  abc  ')
    await advance(1); expect(bridge.applied!.search).toBe('  next!  ')
  })
  if (name === 'Export' || name === 'Dynamic QR') {
    it.each([false, true])('defaults to today and resets freshly across Tashkent midnight, StrictMode=%s', async (strict) => {
      vi.setSystemTime(new Date('2026-10-07T18:59:00Z'))
      const page = name === 'Dynamic QR'
        ? <DynamicQrPage initialInstant={new Date('2026-10-07T18:59:00Z')} /> : <ExportQrPage />
      const content = <QueryClientProvider client={client}>{page}</QueryClientProvider>
      await act(async () => root.render(strict ? <StrictMode>{content}</StrictMode> : content))
      expect(bridge.applied).toMatchObject({ fromDate: '2026-10-07', toDate: '2026-10-07', page: 0, size: 20 })
      expect(bridge.requests).toHaveBeenCalledTimes(name === 'Export' ? 0 : 1)
      await search('  abc  '); await advance(400)
      await act(async () => bridge.date!({ fromDate: '2026-09-01', toDate: '2026-09-15' }))
      await click('Filtrlar'); await edit('1')
      for (const key of ['bankAccountId', 'terminalId', 'status', 'distributionStatus']) await act(async () => bridge.extra!(key))
      await click('Qo‘llash')
      if (name !== 'Export') { await act(async () => bridge.size!(50)); await act(async () => bridge.page!(3)) }
      const committed = { ...bridge.applied! }
      const calls = bridge.requests.mock.calls.length
      await act(async () => bridge.dateReset!())
      expect(bridge.applied).toEqual({ ...committed, fromDate: '2026-10-07', toDate: '2026-10-07', page: 0 })
      expect(bridge.requests.mock.calls.slice(calls).map(([filters]) => filters)).toEqual(name === 'Export' ? [] : [bridge.applied])
      vi.setSystemTime(new Date('2026-10-07T19:30:00Z'))
      const midnightCalls = bridge.requests.mock.calls.length
      await act(async () => bridge.dateReset!())
      expect(bridge.applied).toEqual({ ...committed, fromDate: '2026-10-08', toDate: '2026-10-08', page: 0 })
      expect(bridge.requests.mock.calls.slice(midnightCalls).map(([filters]) => filters)).toEqual(name === 'Export' ? [] : [bridge.applied])
      expect(bridge.exports).not.toHaveBeenCalled()
      await click('Export')
      expect(bridge.exports.mock.lastCall![0]).toEqual({
        fromDate: '2026-10-08', toDate: '2026-10-08', search: '  abc  ',
        merchantId: '1', bankAccountId: '1', terminalId: '1', status: '0', distributionStatus: '0',
      })
      await search('  pending  '); await advance(200)
      await act(async () => bridge.date!({ fromDate: '2026-10-10', toDate: '2026-10-10' }))
      expect(bridge.applied).toEqual({ ...committed, fromDate: '2026-10-10', toDate: '2026-10-10', page: 0 })
      await click('Export'); expect(bridge.exports.mock.lastCall![0].search).toBe('  abc  ')
      await advance(199); expect(bridge.applied!.search).toBe('  abc  ')
      await advance(1); expect(bridge.applied!.search).toBe('  pending  ')
    })
    async function seedBankTerminal(bank: string | undefined, strict = false) {
      await mount(strict); await click('Filtrlar')
      await act(async () => bridge.bank!(bank)); await act(async () => bridge.terminal!('1'))
      await click('Qo‘llash')
      if (name !== 'Export') { await act(async () => bridge.size!(50)); await act(async () => bridge.page!(3)) }
    }
    it.each([
      { from: '1', to: '2', strict: false }, { from: '1', to: '2', strict: true },
      { from: '1', to: undefined, strict: false }, { from: undefined, to: '2', strict: false },
    ])('bank $from → $to clears terminal in draft only, StrictMode=$strict', async ({ from, to, strict }) => {
      await seedBankTerminal(from, strict)
      const committed = { ...bridge.applied! }; const calls = bridge.requests.mock.calls.length
      await click('Filtrlar'); await act(async () => bridge.bank!(to))
      expect(bridge.draftExtra).toMatchObject({ bankAccountId: to, terminalId: undefined })
      expect(bridge.applied).toEqual(committed); expect(bridge.requests).toHaveBeenCalledTimes(calls)
      await click('Export')
      expect(bridge.exports.mock.lastCall![0]).toMatchObject({ terminalId: '1', ...(from ? { bankAccountId: from } : {}) })
      await click('Qo‘llash')
      expect(bridge.applied).toEqual({ ...committed, bankAccountId: to, terminalId: undefined, page: 0 })
      const dispatched = bridge.requests.mock.calls.slice(calls).map((call) => call[0])
      // Returning to fresh cached filters may need no request; any dispatch must be coherent.
      expect(dispatched.length).toBeLessThanOrEqual(name === 'Export' ? 0 : 1)
      for (const filters of dispatched) expect(filters).toEqual(bridge.applied)
      await click('Export')
      expect(bridge.exports.mock.lastCall![0]).not.toHaveProperty('terminalId')
      if (to) expect(bridge.exports.mock.lastCall![0].bankAccountId).toBe(to)
      else expect(bridge.exports.mock.lastCall![0]).not.toHaveProperty('bankAccountId')
      expect(bridge.terminalLookupArgs.mock.calls.every(([args]) => args.length <= 1 && (args[0] === undefined || args[0] === '1'))).toBe(true)
    })
    it.each(['1', ' 1 '])('identical bank %j preserves the selected terminal', async (id) => {
      await seedBankTerminal('1'); await click('Filtrlar'); await act(async () => bridge.bank!(id))
      expect(bridge.draftExtra).toMatchObject({ bankAccountId: '1', terminalId: '1' })
    })
    it('bank reselect and lookup refresh never resurrect terminal; explicit terminal selection commits', async () => {
      await seedBankTerminal('1'); await click('Filtrlar'); await act(async () => bridge.bank!('2'))
      expect(bridge.draftExtra.terminalId).toBeUndefined()
      await act(async () => client.removeQueries({ queryKey: ['drawer-lookup', 'terminal', '1'], exact: true }))
      await advance(0); expect(bridge.draftExtra.terminalId).toBeUndefined()
      await act(async () => bridge.bank!('1')); expect(bridge.draftExtra.terminalId).toBeUndefined()
      await act(async () => bridge.bank!('2')); await act(async () => bridge.terminal!('2'))
      await click('Qo‘llash')
      expect(bridge.applied).toMatchObject({ bankAccountId: '2', terminalId: '2', page: 0, search: '  abc  ' })
    })
    it('dismiss/reopen restores committed bank and terminal; Reset stays draft-only', async () => {
      await seedBankTerminal('1'); const committed = { ...bridge.applied! }
      await click('Filtrlar'); await act(async () => bridge.bank!('2')); await dismiss('X')
      await click('Filtrlar'); expect(bridge.draftExtra).toMatchObject({ bankAccountId: '1', terminalId: '1' })
      await click('Qayta tiklash'); expect(bridge.draftExtra).toMatchObject({ bankAccountId: undefined, terminalId: undefined })
      expect(bridge.applied).toEqual(committed)
      await click('Qo‘llash'); expect(bridge.applied).toEqual({ ...committed, merchantId: undefined, bankAccountId: undefined, terminalId: undefined, status: undefined, distributionStatus: undefined, page: 0 })
    })
  }
  if (name === 'Export' || name === 'Dynamic QR') it('exports committed filters only before Apply and after Reset', async () => {
    await mount(); await click('Filtrlar'); await edit('2'); await click('Export')
    expect(bridge.exports.mock.lastCall![0].merchantId).toBe('1')
    await click('Qo‘llash'); await click('Export'); expect(bridge.exports.mock.lastCall![0].merchantId).toBe('2')
    await click('Filtrlar'); await click('Qayta tiklash'); await click('Export')
    expect(bridge.exports.mock.lastCall![0].merchantId).toBe('2')
    await click('Qo‘llash'); await click('Export'); expect(bridge.exports.mock.lastCall![0]).not.toHaveProperty('merchantId')
  })
})

it('keeps Dynamic QR explicit invalid-filter recovery as an immediate full clear', async () => {
  vi.setSystemTime(new Date('2026-10-07T18:59:00Z'))
  bridge.invalid = true
  await act(async () => root.render(<QueryClientProvider client={client}><DynamicQrPage initialInstant={new Date('2026-10-07T18:59:00Z')} /></QueryClientProvider>))
  await search('abc'); await advance(400)
  vi.setSystemTime(new Date('2026-10-07T19:30:00Z'))
  await click('Filtrni tozalash')
  expect(bridge.applied).toEqual({ search: '', status: undefined, page: 0, size: 20, fromDate: '2026-10-08', toDate: '2026-10-08' })
})

it.each([
  [{ fromDate: '2026-10-01', toDate: '2026-10-07', terminalId: '1' }, '2026-10-01', '2026-10-07', '1'],
  [{ fromDate: '2026-10-07', toDate: '2026-10-01', terminalId: '1' }, '2026-10-08', '2026-10-08', undefined],
  [{ fromDate: '2026-02-30', toDate: '2026-10-07', terminalId: '1' }, '2026-10-08', '2026-10-08', undefined],
  [{ fromDate: '2026-10-01', toDate: '2026-10-07', terminalId: '' }, '2026-10-08', '2026-10-08', undefined],
] as const)('preserves validated Dashboard state or falls back atomically: %j', async (initialState, fromDate, toDate, terminalId) => {
  vi.setSystemTime(new Date('2026-10-07T19:30:00Z'))
  await act(async () => root.render(<QueryClientProvider client={client}><DynamicQrPage initialState={initialState} /></QueryClientProvider>))
  expect(bridge.applied).toMatchObject({ fromDate, toDate, search: '', page: 0, size: 20 })
  expect((bridge.applied as DynamicQrFilters).terminalId).toBe(terminalId)
})
