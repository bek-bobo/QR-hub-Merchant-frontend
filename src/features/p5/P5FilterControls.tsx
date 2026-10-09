import { useP5Presentation } from './presentation'
import { useEffect, type FormEvent } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { LookupFilterSelect } from '@/shared/ui/LookupFilterSelect'
import { FilterFieldCard } from '@/shared/ui/FilterFieldCard'
import type { LookupSelectState } from '@/shared/ui/lookup-select-state'
import { changeP5AdvancedMerchant, isP5StatusDraftValid, resolveP5StatusDraft, type P5AdvancedDraft, type P5StatusDraft } from './page-state'

export function P5QuickSearch({ searchDraft, onDraftChange }: {
  readonly searchDraft: string; readonly onDraftChange: (search: string) => void
}) {
  const p = useP5Presentation()
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault() }
  return <form className="relative w-full min-w-0 lg:w-[min(100%,32rem)]" role="search" onSubmit={submit}>
    <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-secondary" />
    <Input type="text" enterKeyHint="search" value={searchDraft} className="h-11 rounded-xl bg-surface pl-12 pr-10 text-sm"
      aria-label={p.message('search.label')} placeholder={p.message('search.placeholder')}
      onChange={(event) => onDraftChange(event.target.value)} />
    {searchDraft ? <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1/2 -translate-y-1/2"
      aria-label={p.common('search.clear')} onClick={() => onDraftChange('')}><XIcon aria-hidden="true" /></Button> : null}
    <button type="submit" className="sr-only" aria-label={p.common('search.apply')}>{p.common('search.apply')}</button>
  </form>
}

export function P5AdvancedFilterFields({ draft, merchants, terminals, merchantState, terminalState,
  onChange, onReconcileDraft, validationMessage }: {
  readonly draft: P5AdvancedDraft
  readonly merchants?: readonly { readonly id: string; readonly name: string }[]
  readonly terminals?: readonly { readonly id: string; readonly name: string }[]
  readonly merchantState: LookupSelectState; readonly terminalState: LookupSelectState
  readonly onChange: (draft: P5AdvancedDraft) => void; readonly onReconcileDraft?: () => void
  readonly validationMessage: string | null
}) {
  const p = useP5Presentation()
  useEffect(() => { onReconcileDraft?.() }, [onReconcileDraft])
  const statusValid = isP5StatusDraftValid(draft.statusDraft)
  return <div className="grid min-w-0 gap-4">
    <LookupFilterSelect label={p.message('fields.merchant')} value={draft.merchantId} options={merchants} state={merchantState}
      allLabel={p.message('filters.allMerchants')} emptyLabel={p.message('filters.noMerchants')} errorLabel={p.message('filters.merchantsFailed')}
      onChange={(id) => onChange(changeP5AdvancedMerchant(draft, id))} />
    <LookupFilterSelect label={p.message('fields.terminal')} value={draft.terminalId} options={terminals}
      state={draft.merchantId ? terminalState : 'unavailable'} allLabel={p.message('filters.allTerminals')}
      emptyLabel={p.message('filters.noMerchantTerminals')}
      errorLabel={draft.merchantId ? p.message('filters.terminalsFailed') : p.message('filters.chooseMerchant')}
      hideUnavailableDescription={!draft.merchantId}
      onChange={(id) => onChange({ ...draft, terminalId: id })} />
    <FilterFieldCard><label className="block min-w-0 space-y-1.5 text-sm font-medium text-text-primary">{p.message('filters.status')}<Select value={draft.statusDraft.mode} onChange={(event) => onChange({ ...draft,
        statusDraft: { mode: event.target.value as P5StatusDraft['mode'], code: '' } })}>
        <option value="all">{p.message('filters.all')}</option><option value="0">{p.message('status.qrActive')}</option>
        <option value="1">{p.message('status.inactive')}</option><option value="custom">{p.message('filters.custom')}</option>
      </Select>
    </label></FilterFieldCard>
    {draft.statusDraft.mode === 'custom' ? <FilterFieldCard>
      <label className="block min-w-0 space-y-1.5 text-sm font-medium text-text-primary">{p.message('filters.statusCode')}<Input type="number" step={1} min={-2147483648} max={2147483647} value={draft.statusDraft.code}
          aria-invalid={!statusValid} aria-describedby={!statusValid ? 'p5-custom-status-error' : undefined}
          onChange={(event) => onChange({ ...draft, statusDraft: { mode: 'custom', code: event.target.value } })} />
      </label>
      {statusValid ? <p className="text-xs text-text-secondary">{p.message('filters.codeValue', { code: String(resolveP5StatusDraft(draft.statusDraft)) })}</p>
        : <p id="p5-custom-status-error" role="status" className="text-xs text-text-secondary">{p.message('filters.codeInvalid')}</p>}
    </FilterFieldCard> : null}
    {validationMessage ? <p id="p5-filter-error" role="alert" className="text-sm text-destructive">{validationMessage}</p> : null}
  </div>
}
