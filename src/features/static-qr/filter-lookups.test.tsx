import { renderToString } from '@/test/locale-fixture'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { useStaticQrFilterLookups } from './filter-lookups'
import { applyStaticQrAdvancedDraft, defaultStaticFilters, type StaticQrAdvancedDraft } from './page-state'
import { readKeys } from '@/shared/api/read-keys'

const response = vi.hoisted(() => ({ draft: 'ready', regionFailed: false, appliedTerminalFailed: false, appliedDistrictFailed: false }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled: boolean; queryKey: readonly unknown[] }) => {
    const kind = options.queryKey[3]
    const parent = options.queryKey[4]
    const isDraftChild = (kind === 'terminal-lookup' && parent === '5') || (kind === 'district-lookup' && parent === '7')
    const failed = (isDraftChild && response.draft === 'error') || (kind === 'region-lookup' && response.regionFailed) ||
      (kind === 'terminal-lookup' && parent === '1' && response.appliedTerminalFailed) ||
      (kind === 'district-lookup' && parent === '3' && response.appliedDistrictFailed)
    const pending = isDraftChild && response.draft === 'loading'
    const data = kind === 'merchant-lookup' ? [{ id: '1', name: 'Applied' }, { id: '5', name: 'Draft' }]
      : kind === 'region-lookup' ? [{ id: '3', name: 'Applied region' }, { id: '7', name: 'Draft region' }]
        : isDraftChild && response.draft === 'empty' ? []
          : [{ id: kind === 'terminal-lookup' ? parent === '1' ? 'T-Applied' : 'T-Draft' : parent === '3' ? '4' : '8', name: 'Child' }]
    return { data: options.enabled && !failed && !pending ? data : undefined, isPending: !options.enabled || pending, isError: failed }
  },
}))

const scope = { source: 'live', sessionScopeId: 'static', accessRevision: 1 } as const
function inspect(draft: StaticQrAdvancedDraft = { merchantId: '5', terminalId: 'T-Draft', regionId: '7', districtId: '8' }) {
  const applied = { ...defaultStaticFilters, merchantId: '1', terminalId: 'T-Applied', regionId: '3', districtId: '4', search: 'old', page: 2 }
  const terminalLookupOptions = vi.fn((id?: string) => ({ enabled: true, queryKey: readKeys.terminalsForMerchant(scope, id) }))
  const regionLookupOptions = vi.fn(() => ({ enabled: true, queryKey: readKeys.regionLookup(scope) }))
  const districtLookupOptions = vi.fn((id?: string) => ({ enabled: Boolean(id), queryKey: readKeys.districtLookup(scope, id) }))
  const runtime = { queries: { merchantLookupOptions: () => ({ enabled: true, queryKey: readKeys.merchantLookup(scope) }),
    terminalLookupOptions, regionLookupOptions, districtLookupOptions } } as unknown as ReadRuntimeContextValue
  function Probe() {
    const result = useStaticQrFilterLookups(draft, applied, true)
    const next = applyStaticQrAdvancedDraft(applied, result.reconciledDraft, result.validation)
    return <output data-applied-confirmed={String(result.appliedConfirmed)}
      data-terminal-state={result.fields.terminalState} data-region-state={result.fields.regionState}
      data-district-state={result.fields.districtState}
      data-terminal-count={result.draftTerminals.data?.length ?? 0}
      data-district-count={result.draftDistricts.data?.length ?? 0}
      data-terminal-error={String(result.draftTerminals.isError)} data-district-error={String(result.draftDistricts.isError)}
      data-draft-unchanged={String(result.reconciledDraft === draft)}
      data-draft-terminal={result.reconciledDraft.terminalId ?? ''} data-draft-district={result.reconciledDraft.districtId ?? ''}
      data-apply-valid={String(Boolean(next))} data-next-terminal={next?.terminalId ?? ''}
      data-next-district={next?.districtId ?? ''} data-next-search={next?.search ?? ''} data-next-page={next?.page} />
  }
  const html = renderToString(<ReadRuntimeContext value={runtime}><Probe /></ReadRuntimeContext>)
  return { html, applied, terminalLookupOptions, regionLookupOptions, districtLookupOptions }
}

describe('Static QR shared lookups and draft isolation', () => {
  beforeEach(() => { response.draft = 'ready'; response.regionFailed = false; response.appliedTerminalFailed = false; response.appliedDistrictFailed = false })

  it('reuses shared geography keys and resolves children under distinct draft and applied parents', () => {
    const { html, applied, terminalLookupOptions, regionLookupOptions, districtLookupOptions } = inspect()
    expect(terminalLookupOptions.mock.calls).toEqual([['5'], ['1']])
    expect(districtLookupOptions.mock.calls).toEqual([['7'], ['3']])
    expect(regionLookupOptions.mock.results[0]?.value.queryKey).toEqual(readKeys.regionLookup(scope))
    expect(districtLookupOptions.mock.results[0]?.value.queryKey).toEqual(readKeys.districtLookup(scope, '7'))
    expect(html).toContain('data-applied-confirmed="true"')
    expect(html).toContain('data-region-state="ready"')
    expect(html).toContain('data-draft-terminal="T-Draft"')
    expect(html).toContain('data-draft-district="8"')
    expect(applied).toMatchObject({ terminalId: 'T-Applied', regionId: '3', districtId: '4', page: 2 })
  })

  it.each(['loading', 'error'])('does not block the applied list or silently clear drafts on draft %s', (state) => {
    response.draft = state
    const { html, applied } = inspect()
    expect(html).toContain(`data-terminal-state="${state}"`)
    expect(html).toContain(`data-district-state="${state}"`)
    expect(html).toContain('data-applied-confirmed="true"')
    expect(html).toContain('data-draft-unchanged="true"')
    expect(html).toContain('data-apply-valid="false"')
    expect(applied).toMatchObject({ merchantId: '1', terminalId: 'T-Applied', regionId: '3', districtId: '4', search: 'old', page: 2 })
  })

  it('distinguishes successful empty lookups and reconciles only draft children before Apply', () => {
    response.draft = 'empty'
    const { html, applied } = inspect()
    for (const [field, value] of [['terminal-count', '0'], ['district-count', '0'], ['terminal-state', 'empty'], ['district-state', 'empty'],
      ['terminal-error', 'false'], ['district-error', 'false'], ['draft-terminal', ''], ['draft-district', ''],
      ['applied-confirmed', 'true'], ['apply-valid', 'true'], ['next-terminal', ''], ['next-district', ''], ['next-search', 'old'], ['next-page', '0']]) {
      expect(html).toContain(`data-${field}="${value}"`)
    }
    expect(applied).toMatchObject({ terminalId: 'T-Applied', districtId: '4', page: 2 })
  })

  it('keeps applied selections but pauses their reads if applied domains lose confirmation', () => {
    response.appliedTerminalFailed = true
    expect(inspect().html).toContain('data-applied-confirmed="false"')
    response.appliedTerminalFailed = false
    response.appliedDistrictFailed = true
    expect(inspect().html).toContain('data-applied-confirmed="false"')
    response.appliedDistrictFailed = false
    response.regionFailed = true
    const { html, applied } = inspect()
    expect(html).toContain('data-region-state="error"')
    expect(html).toContain('data-applied-confirmed="false"')
    expect(applied).toMatchObject({ regionId: '3', districtId: '4' })
  })

  it('uses global Terminal lookup without merchant and disables District lookup without region', () => {
    const { html, terminalLookupOptions, districtLookupOptions } = inspect({})
    expect(terminalLookupOptions.mock.calls[0]).toEqual([undefined])
    expect(terminalLookupOptions.mock.results[0]?.value.queryKey).toEqual(readKeys.terminals(scope))
    expect(districtLookupOptions.mock.calls[0]).toEqual([undefined])
    expect(districtLookupOptions.mock.results[0]?.value.enabled).toBe(false)
    expect(html).toContain('data-terminal-state="ready"')
    expect(html).toContain('data-district-state="unavailable"')
  })
})
