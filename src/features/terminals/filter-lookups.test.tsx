import { renderToString } from '@/test/locale-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { useTerminalFilterLookups } from './filter-lookups'
import { applyTerminalAdvancedDraft, createDefaultTerminalFilters, type TerminalAdvancedDraft } from './page-state'
import { toTerminalListQuery } from '@/shared/contracts/management-filters'

const response = vi.hoisted(() => ({ draft: 'ready', appliedDistrictFailed: false, regionsFailed: false }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled: boolean; queryKey: readonly (string | undefined)[] }) => {
    const [kind, parent] = options.queryKey
    const isDraftChild = (kind === 'banks' && parent === '5') || (kind === 'districts' && parent === '7')
    const failed = (isDraftChild && response.draft === 'error') || (kind === 'regions' && response.regionsFailed) ||
      (kind === 'districts' && parent === '3' && response.appliedDistrictFailed)
    const pending = isDraftChild && response.draft === 'loading'
    const data = kind === 'merchants' ? [{ id: '1', name: 'Applied' }, { id: '5', name: 'Draft' }]
      : kind === 'regions' ? [{ id: '3', name: 'Applied region' }, { id: '7', name: 'Draft region' }]
        : isDraftChild && response.draft === 'empty' ? []
          : [{ id: kind === 'banks' ? parent === '1' ? '2' : '6' : parent === '3' ? '4' : '8', name: 'Child' }]
    return { data: options.enabled && !failed && !pending ? data : undefined, isPending: !options.enabled || pending, isError: failed }
  },
}))

function inspect(draft: TerminalAdvancedDraft = { merchantId: '5', bankAccountId: '6', regionId: '7', districtId: '8' }) {
  const applied = { ...createDefaultTerminalFilters(), merchantId: '1', bankAccountId: '2', regionId: '3', districtId: '4', search: 'old', page: 2 }
  const bankAccountLookupOptions = vi.fn((id?: string) => ({ enabled: true, queryKey: ['banks', id] }))
  const districtLookupOptions = vi.fn((id?: string) => ({ enabled: Boolean(id), queryKey: ['districts', id] }))
  const runtime = { capabilities: { terminalList: true }, queries: {
    merchantLookupOptions: () => ({ enabled: true, queryKey: ['merchants'] }),
    regionLookupOptions: () => ({ enabled: true, queryKey: ['regions'] }), bankAccountLookupOptions, districtLookupOptions,
  } } as unknown as ReadRuntimeContextValue
  function Probe() {
    const result = useTerminalFilterLookups(draft, applied)
    const application = inspectDraftApplication(result, applied)
    return <output data-bank-count={result.draftBanks.data?.length ?? 0}
      data-district-count={result.draftDistricts.data?.length ?? 0}
      data-bank-state={result.fields.bankState} data-district-state={result.fields.districtState}
      data-region-state={result.fields.regionState}
      data-bank-error={String(result.draftBanks.isError)}
      data-district-error={String(result.draftDistricts.isError)}
      data-district-pending={String(result.draftDistricts.isPending)}
      data-draft-unchanged={String(result.reconciledDraft === draft)}
      data-draft-merchant={result.reconciledDraft.merchantId ?? ''}
      data-draft-bank={result.reconciledDraft.bankAccountId ?? ''}
      data-draft-region={result.reconciledDraft.regionId ?? ''}
      data-draft-district={result.reconciledDraft.districtId ?? ''}
      data-apply-valid={String(application.valid)}
      data-apply-query={JSON.stringify(application.query)}
      data-applied-ready={String(result.appliedReady)} />
  }
  const html = renderToString(<ReadRuntimeContext value={runtime}><Probe /></ReadRuntimeContext>)
  return { html, applied, draft, bankAccountLookupOptions, districtLookupOptions }
}

function inspectDraftApplication(result: ReturnType<typeof useTerminalFilterLookups>,
  applied: Parameters<typeof applyTerminalAdvancedDraft>[0]) {
  try {
    return { valid: true, query: toTerminalListQuery(applyTerminalAdvancedDraft(applied, result.reconciledDraft, result.validation)) }
  } catch {
    return { valid: false, query: null }
  }
}

describe('Terminal draft and applied lookup isolation', () => {
  beforeEach(() => { response.draft = 'ready'; response.appliedDistrictFailed = false; response.regionsFailed = false })

  it('observes separate merchant and region parents while retaining applied selections', () => {
    const { html, applied, bankAccountLookupOptions, districtLookupOptions } = inspect()
    expect(bankAccountLookupOptions.mock.calls).toEqual([['5'], ['1']])
    expect(districtLookupOptions.mock.calls).toEqual([['7'], ['3']])
    expect(html).toContain('data-applied-ready="true"')
    expect(html).toContain('data-region-state="ready"')
    expect(html).toContain('data-draft-bank="6"')
    expect(html).toContain('data-draft-district="8"')
    expect(applied).toMatchObject({ merchantId: '1', bankAccountId: '2', regionId: '3', districtId: '4', page: 2 })
  })

  it.each(['error', 'loading'])('keeps draft %s separate from confirmed applied filters', (state) => {
    response.draft = state
    const { html, applied } = inspect()
    expect(html).toContain(`data-bank-state="${state}"`)
    expect(html).toContain(`data-district-state="${state}"`)
    expect(html).toContain('data-applied-ready="true"')
    expect(html).toContain('data-draft-unchanged="true"')
    expect(html).toContain('data-apply-valid="false"')
    expect(applied).toMatchObject({ merchantId: '1', bankAccountId: '2', regionId: '3', districtId: '4', search: 'old', page: 2 })
  })

  it('proves success-empty, removes only stale draft children, and omits them on Apply', () => {
    response.draft = 'empty'
    const { html, applied } = inspect()
    expect(html).toContain('data-bank-count="0"')
    expect(html).toContain('data-district-count="0"')
    expect(html).toContain('data-bank-state="empty"')
    expect(html).toContain('data-district-state="empty"')
    expect(html).toContain('data-bank-error="false"')
    expect(html).toContain('data-district-error="false"')
    expect(html).toContain('data-district-pending="false"')
    expect(html).toContain('data-applied-ready="true"')
    expect(html).toContain('data-draft-merchant="5"')
    expect(html).toContain('data-draft-bank=""')
    expect(html).toContain('data-draft-region="7"')
    expect(html).toContain('data-draft-district=""')
    expect(html).toContain('data-apply-valid="true"')
    const encodedQuery = html.match(/data-apply-query="([^"]*)"/)?.[1]
    expect(JSON.parse(encodedQuery?.replaceAll('&quot;', '"') ?? 'null'))
      .toEqual({ merchantId: '5', regionId: '7', search: 'old', page: '0', size: '20' })
    expect(applied).toMatchObject({ merchantId: '1', bankAccountId: '2', regionId: '3', districtId: '4', page: 2 })
  })

  it('pauses unconfirmed applied geography without silently clearing it', () => {
    response.appliedDistrictFailed = true
    expect(inspect().html).toContain('data-applied-ready="false"')
    response.appliedDistrictFailed = false
    response.regionsFailed = true
    const { html, applied } = inspect()
    expect(html).toContain('data-region-state="error"')
    expect(html).toContain('data-applied-ready="false"')
    expect(applied).toMatchObject({ regionId: '3', districtId: '4' })
  })

  it('uses an unavailable district state without a region and still permits unscoped banks', () => {
    const { html, districtLookupOptions } = inspect({})
    expect(districtLookupOptions.mock.calls[0]).toEqual([undefined])
    expect(html).toContain('data-district-state="unavailable"')
    expect(html).toContain('data-bank-state="ready"')
  })
})
