import { useStaticQrPresentation } from './presentation'
import { useEffect, type FormEvent } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LookupFilterSelect } from '@/shared/ui/LookupFilterSelect'
import type { LookupSelectState } from '@/shared/ui/lookup-select-state'
import type { ManagementOption } from '@/shared/contracts/management-read'
import { changeStaticMerchantDraft, changeStaticRegionDraft, type StaticQrAdvancedDraft } from './page-state'

interface QuickSearchProps {
  readonly searchDraft: string
  readonly onDraftChange: (search: string) => void
}

export function StaticQrQuickSearch({ searchDraft, onDraftChange }: QuickSearchProps) {
  const p = useStaticQrPresentation()
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault() }
  return <form className="relative w-full min-w-0 sm:w-[min(100%,24rem)]" role="search" onSubmit={submit}>
    <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-secondary" />
    <Input type="text" enterKeyHint="search" value={searchDraft} className="h-10 rounded-xl bg-surface pl-12 pr-10 text-sm"
      aria-label={p.message('search.label')} placeholder={p.message('search.placeholder')}
      onChange={(event) => onDraftChange(event.target.value)} />
    {searchDraft ? <Button type="button" variant="ghost" size="icon-sm"
      className="absolute right-1 top-1/2 -translate-y-1/2" aria-label={p.common('search.clear')}
      onClick={() => onDraftChange('')}><XIcon aria-hidden="true" /></Button> : null}
    <button type="submit" className="sr-only" aria-label={p.common('search.apply')}>{p.common('search.apply')}</button>
  </form>
}

interface AdvancedFieldsProps {
  readonly draft: StaticQrAdvancedDraft
  readonly merchants?: readonly ManagementOption[]
  readonly terminals?: readonly ManagementOption[]
  readonly regions?: readonly ManagementOption[]
  readonly districts?: readonly ManagementOption[]
  readonly merchantState: LookupSelectState
  readonly terminalState: LookupSelectState
  readonly regionState: LookupSelectState
  readonly districtState: LookupSelectState
  readonly onChange: (draft: StaticQrAdvancedDraft) => void
  readonly onReconcileDraft?: () => void
}

export function StaticQrAdvancedFilterFields({ draft, merchants, terminals, regions, districts,
  merchantState, terminalState, regionState, districtState, onChange, onReconcileDraft }: AdvancedFieldsProps) {
  const p = useStaticQrPresentation()
  useEffect(() => { onReconcileDraft?.() }, [onReconcileDraft])
  return <div className="grid min-w-0 gap-4">
    <LookupFilterSelect label={p.message('fields.merchant')} value={draft.merchantId} options={merchants} state={merchantState}
      allLabel={p.message('filters.allMerchants')} emptyLabel={p.message('filters.noMerchants')} errorLabel={p.message('filters.merchantsFailed')}
      onChange={(id) => onChange(changeStaticMerchantDraft(draft, id))} />
    <LookupFilterSelect label={p.message('fields.terminal')} value={draft.terminalId} options={terminals} state={terminalState}
      allLabel={p.message('filters.allTerminals')} emptyLabel={draft.merchantId ? p.message('filters.noMerchantTerminals') : p.message('filters.noTerminals')}
      errorLabel={p.message('filters.terminalsFailed')} onChange={(id) => onChange({ ...draft, terminalId: id })} />
    <LookupFilterSelect label={p.message('fields.region')} value={draft.regionId} options={regions} state={regionState}
      allLabel={p.message('filters.allRegions')} emptyLabel={p.message('filters.noRegions')} errorLabel={p.message('filters.regionsFailed')}
      onChange={(id) => onChange(changeStaticRegionDraft(draft, id))} />
    <LookupFilterSelect label={p.message('fields.district')} value={draft.districtId} options={districts}
      state={draft.regionId ? districtState : 'unavailable'} allLabel={p.message('filters.allDistricts')}
      emptyLabel={p.message('filters.noDistricts')}
      errorLabel={draft.regionId ? p.message('filters.districtsFailed') : p.message('filters.chooseRegion')}
      hideUnavailableDescription={!draft.regionId}
      onChange={(id) => onChange({ ...draft, districtId: id })} />
  </div>
}
