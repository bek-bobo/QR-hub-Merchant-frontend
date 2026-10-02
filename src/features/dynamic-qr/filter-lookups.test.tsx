import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { advancedFilterFieldProps, useDynamicQrFilterLookups } from './filter-lookups'
import { createDefaultDynamicQrFilters } from './page-state'
import { toDynamicQrQuery } from './filters'

const responses = vi.hoisted(() => ({ failedDraft: false, failedMerchant: false, emptyDraft: false }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled: boolean; queryKey: readonly string[] }) => {
    const [kind, merchantId] = options.queryKey
    const failed = (responses.failedDraft && merchantId === '3') || (responses.failedMerchant && kind === 'merchant')
    const data = kind === 'merchant' ? [{ id: '1', name: 'First' }, { id: '3', name: 'Draft' }]
      : kind === 'bank' ? responses.emptyDraft && merchantId === '3' ? [] : [{ id: merchantId === '1' ? '2' : '4', name: 'Bank' }]
        : [{ id: 'terminal-a', name: 'Terminal A' }]
    return { data: options.enabled && !failed ? data : undefined,
      isPending: !options.enabled, isError: failed }
  },
}))

function inspectLookups() {
  const applied = { ...createDefaultDynamicQrFilters(new Date('2026-10-02T00:00:00Z')),
    merchantId: '1', bankAccountId: '2', terminalId: 'terminal-a' }
  const draft = { merchantId: '3', bankAccountId: undefined, terminalId: undefined }
  const bankAccountLookupOptions = vi.fn((id?: string) => ({ enabled: true, queryKey: ['bank', id] }))
  const terminalLookupOptions = vi.fn((id?: string) => ({ enabled: true, queryKey: ['terminal', id] }))
  const runtime = { queries: {
    merchantLookupOptions: () => ({ enabled: true, queryKey: ['merchant'] }),
    bankAccountLookupOptions, terminalLookupOptions,
  } } as unknown as ReadRuntimeContextValue
  function Probe() {
    const result = useDynamicQrFilterLookups(draft, applied)
    const fields = advancedFilterFieldProps(result, draft, vi.fn())
    return <output data-bank-id={result.draftBanks.data?.[0]?.id ?? ''}
      data-bank-count={result.draftBanks.data?.length ?? 0}
      data-bank-empty={String(result.draftBanks.data?.length === 0)}
      data-bank-disabled={String(fields.banksDisabled)}
      data-bank-pending={String(result.draftBanks.isPending)}
      data-bank-state={fields.bankLookupState}
      data-bank-error={String(result.draftBanks.isError)}
      data-applied-state={result.appliedFilterState}
      data-terminal-state={result.terminalFilterState} />
  }
  const html = renderToString(<ReadRuntimeContext value={runtime}><Probe /></ReadRuntimeContext>)
  return { html, applied, bankAccountLookupOptions, terminalLookupOptions }
}

describe('dynamic QR draft and applied lookups', () => {
  beforeEach(() => { responses.failedDraft = false; responses.failedMerchant = false; responses.emptyDraft = false })
  it('uses separate parent identities while retaining the applied bank and terminal', () => {
    const { html, applied, bankAccountLookupOptions, terminalLookupOptions } = inspectLookups()
    expect(bankAccountLookupOptions.mock.calls).toEqual([['3'], ['1']])
    expect(terminalLookupOptions.mock.calls).toEqual([['3'], ['1']])
    expect(html).toContain('data-bank-id="4"')
    expect(html).toContain('data-applied-state="valid"')
    expect(applied).toMatchObject({ merchantId: '1', bankAccountId: '2', terminalId: 'terminal-a' })
  })
  it('does not block the already-applied selection when the draft parent lookup fails', () => {
    responses.failedDraft = true
    const { html } = inspectLookups()
    expect(html).toContain('data-bank-error="true"')
    expect(html).toContain('data-applied-state="valid"')
    expect(html).toContain('data-terminal-state="valid"')
  })
  it('blocks an unconfirmed applied merchant without changing terminal confirmation for stats', () => {
    responses.failedMerchant = true
    const { html } = inspectLookups()
    expect(html).toContain('data-applied-state="invalid"')
    expect(html).toContain('data-terminal-state="valid"')
  })
  it('presents an empty draft bank domain without blocking the applied parent selection', () => {
    responses.emptyDraft = true
    const { html, applied } = inspectLookups()
    expect(html).toContain('data-bank-count="0"')
    expect(html).toContain('data-bank-empty="true"')
    expect(html).toContain('data-bank-disabled="true"')
    expect(html).toContain('data-bank-pending="false"')
    expect(html).toContain('data-bank-error="false"')
    expect(html).toContain('data-bank-state="empty"')
    expect(html).toContain('data-applied-state="valid"')
    expect(applied).toMatchObject({ merchantId: '1', bankAccountId: '2' })
  })

  it('reconciles controlled draft props and publishes only the cleared draft', () => {
    const applied = { merchantId: '1', bankAccountId: '2' }
    const evidence = {
      merchants: { enabled: true, pending: false, error: false, ids: ['1'] },
      banks: { enabled: true, pending: false, error: false, ids: [], merchantId: '1' },
      terminals: { enabled: true, pending: false, error: false, ids: [], merchantId: '1' },
    }
    const lookups = {
      draftEvidence: evidence,
      merchants: { data: [{ id: '1', name: 'Merchant' }] },
      draftBanks: { data: [] }, draftTerminals: { data: [] },
    } as unknown as ReturnType<typeof useDynamicQrFilterLookups>
    const onChange = vi.fn()
    const props = advancedFilterFieldProps(lookups, applied, onChange)
    expect(props.bankAccountId).toBeUndefined()
    expect(props.bankLookupState).toBe('empty')
    expect(onChange).not.toHaveBeenCalled()
    props.onReconcileDraft?.()
    expect(onChange).toHaveBeenCalledWith({ merchantId: '1', bankAccountId: undefined })
    const query = toDynamicQrQuery({ ...createDefaultDynamicQrFilters(), ...onChange.mock.calls[0][0] })
    expect(query).not.toHaveProperty('bankAccountId')
    expect(query.merchantId).toBe('1')
    expect(applied.bankAccountId).toBe('2')
    const settled = advancedFilterFieldProps(lookups, { merchantId: '1' }, onChange)
    expect(settled.onReconcileDraft).toBeUndefined()
  })
})
