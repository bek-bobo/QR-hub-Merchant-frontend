import { useTerminalPresentation } from './presentation'
import { useEffect, type FormEvent } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LookupFilterSelect } from '@/shared/ui/LookupFilterSelect'
import type { LookupSelectState } from '@/shared/ui/lookup-select-state'
import type { ManagementOption } from '@/shared/contracts/management-read'
import { changeTerminalMerchantDraft, changeTerminalRegionDraft, type TerminalAdvancedDraft } from './page-state'

interface QuickSearchProps {
  readonly searchDraft: string
  readonly onDraftChange: (search: string) => void
}

export function TerminalQuickSearch({ searchDraft, onDraftChange }: QuickSearchProps) {
  const p = useTerminalPresentation()
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault() }
  return <form className="relative w-full min-w-0 sm:w-[28rem]" role="search" onSubmit={submit}>
    <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-secondary" />
    <Input type="text" enterKeyHint="search" value={searchDraft} className="h-10 rounded-xl bg-surface pl-10 pr-9 text-sm"
      aria-label={p.message('search.label')} placeholder={p.message('search.placeholder')}
      onChange={(event) => onDraftChange(event.target.value)} />
    {searchDraft ? <Button type="button" variant="ghost" size="icon-sm"
      className="absolute right-1 top-1/2 -translate-y-1/2" aria-label={p.common('search.clear')}
      onClick={() => onDraftChange('')}><XIcon aria-hidden="true" /></Button> : null}
    <button type="submit" className="sr-only" aria-label={p.common('search.apply')}>{p.common('search.apply')}</button>
  </form>
}

interface AdvancedFieldsProps {
  readonly draft: TerminalAdvancedDraft
  readonly merchants?: readonly ManagementOption[]
  readonly banks?: readonly ManagementOption[]
  readonly regions?: readonly ManagementOption[]
  readonly districts?: readonly ManagementOption[]
  readonly merchantState: LookupSelectState
  readonly bankState: LookupSelectState
  readonly regionState: LookupSelectState
  readonly districtState: LookupSelectState
  readonly onChange: (draft: TerminalAdvancedDraft) => void
  readonly onReconcileDraft?: () => void
}

export function TerminalAdvancedFilterFields({ draft, merchants, banks, regions, districts,
  merchantState, bankState, regionState, districtState, onChange, onReconcileDraft }: AdvancedFieldsProps) {
  const p = useTerminalPresentation()
  useEffect(() => { onReconcileDraft?.() }, [onReconcileDraft])
  return <div className="grid min-w-0 gap-4">
    <LookupFilterSelect label={p.message('fields.merchant')} value={draft.merchantId} options={merchants} state={merchantState}
      allLabel={p.message('filters.allMerchants')} emptyLabel={p.message('filters.noMerchants')} errorLabel={p.message('filters.merchantsFailed')}
      onChange={(id) => onChange(changeTerminalMerchantDraft(draft, id))} />
    <LookupFilterSelect label={p.message('fields.bank')} value={draft.bankAccountId} options={banks} state={bankState}
      allLabel={p.message('filters.allBanks')} emptyLabel={draft.merchantId ? p.message('filters.noMerchantBanks') : p.message('filters.noBanks')}
      errorLabel={p.message('filters.banksFailed')} onChange={(id) => onChange({ ...draft, bankAccountId: id })} />
    <LookupFilterSelect label={p.message('fields.region')} value={draft.regionId} options={regions} state={regionState}
      allLabel={p.message('filters.allRegions')} emptyLabel={p.message('filters.noRegions')} errorLabel={p.message('filters.regionsFailed')}
      onChange={(id) => onChange(changeTerminalRegionDraft(draft, id))} />
    <LookupFilterSelect label={p.message('fields.district')} value={draft.districtId} options={districts}
      state={draft.regionId ? districtState : 'unavailable'} allLabel={p.message('filters.allDistricts')}
      emptyLabel={p.message('filters.noDistricts')}
      errorLabel={draft.regionId ? p.message('filters.districtsFailed') : p.message('filters.chooseRegion')}
      hideUnavailableDescription={!draft.regionId}
      onChange={(id) => onChange({ ...draft, districtId: id })} />
  </div>
}
