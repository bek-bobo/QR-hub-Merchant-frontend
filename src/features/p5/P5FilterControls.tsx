import { useEffect, type FormEvent } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { LookupFilterSelect } from '@/shared/ui/LookupFilterSelect'
import type { LookupSelectState } from '@/shared/ui/lookup-select-state'
import { changeP5AdvancedMerchant, isP5StatusDraftValid, resolveP5StatusDraft, type P5AdvancedDraft, type P5StatusDraft } from './page-state'

export function P5QuickSearch({ searchDraft, onDraftChange, onApply }: {
  readonly searchDraft: string; readonly onDraftChange: (search: string) => void; readonly onApply: (search: string) => void
}) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onApply(searchDraft) }
  return <form className="relative w-full min-w-0 sm:w-80" role="search" onSubmit={submit}>
    <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
    <Input type="text" enterKeyHint="search" value={searchDraft} className="h-9 pl-9 pr-9"
      aria-label="Qurilma ID yoki terminal nomi bo‘yicha qidirish" placeholder="Qurilma ID yoki terminal nomi"
      onChange={(event) => onDraftChange(event.target.value)} />
    {searchDraft ? <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1/2 -translate-y-1/2"
      aria-label="Qidiruvni tozalash" onClick={() => { onDraftChange(''); onApply('') }}><XIcon aria-hidden="true" /></Button> : null}
    <button type="submit" className="sr-only" aria-label="Qidiruvni qo‘llash">Qidiruvni qo‘llash</button>
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
  useEffect(() => { onReconcileDraft?.() }, [onReconcileDraft])
  const statusValid = isP5StatusDraftValid(draft.statusDraft)
  return <div className="grid min-w-0 gap-4">
    <LookupFilterSelect label="Merchant" value={draft.merchantId} options={merchants} state={merchantState}
      allLabel="Barcha merchantlar" emptyLabel="Merchant mavjud emas" errorLabel="Merchantlarni yuklab bo‘lmadi"
      onChange={(id) => onChange(changeP5AdvancedMerchant(draft, id))} />
    <LookupFilterSelect label="Terminal" value={draft.terminalId} options={terminals}
      state={draft.merchantId ? terminalState : 'unavailable'} allLabel="Barcha terminallar"
      emptyLabel="Bu merchant uchun terminal mavjud emas"
      errorLabel={draft.merchantId ? 'Terminallarni yuklab bo‘lmadi' : 'Avval merchantni tanlang'}
      hideUnavailableDescription={!draft.merchantId}
      onChange={(id) => onChange({ ...draft, terminalId: id })} />
    <label className="block min-w-0 space-y-1.5 text-sm font-medium text-text-primary">Status
      <Select value={draft.statusDraft.mode} onChange={(event) => onChange({ ...draft,
        statusDraft: { mode: event.target.value as P5StatusDraft['mode'], code: '' } })}>
        <option value="all">Barchasi</option><option value="0">Faol</option>
        <option value="1">Faol emas / administrator belgisi</option><option value="custom">Boshqa status kodi...</option>
      </Select>
    </label>
    {draft.statusDraft.mode === 'custom' ? <div className="min-w-0 space-y-1.5">
      <label className="block min-w-0 space-y-1.5 text-sm font-medium text-text-primary">Status kodi
        <Input type="number" step={1} min={-2147483648} max={2147483647} value={draft.statusDraft.code}
          aria-invalid={!statusValid} aria-describedby={!statusValid ? 'p5-custom-status-error' : undefined}
          onChange={(event) => onChange({ ...draft, statusDraft: { mode: 'custom', code: event.target.value } })} />
      </label>
      {statusValid ? <p className="text-xs text-text-secondary">Status kodi: {resolveP5StatusDraft(draft.statusDraft)}</p>
        : <p id="p5-custom-status-error" role="status" className="text-xs text-text-secondary">Butun status kodini kiriting (-2147483648…2147483647).</p>}
    </div> : null}
    {validationMessage ? <p id="p5-filter-error" role="alert" className="text-sm text-destructive">{validationMessage}</p> : null}
  </div>
}
