import { useCashierPresentation } from './presentation'
import { useEffect, type FormEvent } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LookupFilterSelect } from '@/shared/ui/LookupFilterSelect'
import type { LookupSelectState } from '@/shared/ui/lookup-select-state'
import { changeCashierMerchantDraft, type CashierAdvancedDraft } from './page-state'

interface QuickSearchProps {
  readonly searchDraft: string
  readonly onDraftChange: (search: string) => void
  readonly onApply: (search: string) => void
}

export function CashierQuickSearch({ searchDraft, onDraftChange, onApply }: QuickSearchProps) {
  const p = useCashierPresentation()
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onApply(searchDraft) }
  return <form className="relative w-full min-w-0 sm:w-[21rem]" role="search" onSubmit={submit}>
    <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-secondary" />
    <Input type="text" enterKeyHint="search" value={searchDraft} className="h-10 rounded-xl bg-surface pl-10 pr-9 text-sm"
      aria-label={p.message('search.label')} placeholder={p.message('search.placeholder')}
      onChange={(event) => onDraftChange(event.target.value)} />
    {searchDraft ? <Button type="button" variant="ghost" size="icon-sm"
      className="absolute right-1 top-1/2 -translate-y-1/2" aria-label={p.common('search.clear')}
      onClick={() => { onDraftChange(''); onApply('') }}><XIcon aria-hidden="true" /></Button> : null}
    <button type="submit" className="sr-only" aria-label={p.common('search.apply')}>{p.common('search.apply')}</button>
  </form>
}

interface AdvancedFieldsProps {
  readonly draft: CashierAdvancedDraft
  readonly merchants?: readonly { readonly id: string; readonly name: string }[]
  readonly terminals?: readonly { readonly id: string; readonly name: string }[]
  readonly merchantState: LookupSelectState
  readonly terminalState: LookupSelectState
  readonly onChange: (draft: CashierAdvancedDraft) => void
  readonly onReconcileDraft?: () => void
  readonly appliedTerminalId?: string
}

export function CashierAdvancedFilterFields({ draft, merchants, terminals, merchantState, terminalState,
  onChange, onReconcileDraft, appliedTerminalId }: AdvancedFieldsProps) {
  const p = useCashierPresentation()
  useEffect(() => { onReconcileDraft?.() }, [onReconcileDraft])
  return <div className="grid min-w-0 gap-4">
    <LookupFilterSelect label={p.message('fields.merchant')} value={draft.merchantId} options={merchants} state={merchantState}
      allLabel={p.message('filters.allMerchants')} emptyLabel={p.message('filters.noMerchants')} errorLabel={p.message('filters.merchantsFailed')}
      onChange={(id) => onChange(changeCashierMerchantDraft(draft, id))} />
    <LookupFilterSelect label={p.message('fields.terminal')} value={draft.terminalId} options={terminals}
      state={draft.merchantId ? terminalState : 'unavailable'} allLabel={p.message('filters.allTerminals')}
      emptyLabel={p.message('filters.noMerchantTerminals')}
      errorLabel={draft.merchantId ? p.message('filters.terminalsFailed') : p.message('filters.chooseMerchant')}
      hideUnavailableDescription={!draft.merchantId}
      onChange={(id) => onChange({ ...draft, terminalId: id })} />
    {appliedTerminalId ? <p className="text-sm text-text-secondary">{p.message('filters.membership')}</p> : null}
  </div>
}
