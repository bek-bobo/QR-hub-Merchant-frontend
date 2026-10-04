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
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onApply(searchDraft) }
  return <form className="relative w-full min-w-0 sm:w-80" role="search" onSubmit={submit}>
    <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
    <Input type="text" enterKeyHint="search" value={searchDraft} className="h-9 pl-9 pr-9"
      aria-label="F.I.Sh. yoki telefon bo‘yicha qidirish" placeholder="F.I.Sh. yoki telefon"
      onChange={(event) => onDraftChange(event.target.value)} />
    {searchDraft ? <Button type="button" variant="ghost" size="icon-sm"
      className="absolute right-1 top-1/2 -translate-y-1/2" aria-label="Qidiruvni tozalash"
      onClick={() => { onDraftChange(''); onApply('') }}><XIcon aria-hidden="true" /></Button> : null}
    <button type="submit" className="sr-only" aria-label="Qidiruvni qo‘llash">Qidiruvni qo‘llash</button>
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
  useEffect(() => { onReconcileDraft?.() }, [onReconcileDraft])
  return <div className="grid min-w-0 gap-4">
    <LookupFilterSelect label="Merchant" value={draft.merchantId} options={merchants} state={merchantState}
      allLabel="Barcha merchantlar" emptyLabel="Merchant mavjud emas" errorLabel="Merchantlarni yuklab bo‘lmadi"
      onChange={(id) => onChange(changeCashierMerchantDraft(draft, id))} />
    <LookupFilterSelect label="Terminal" value={draft.terminalId} options={terminals}
      state={draft.merchantId ? terminalState : 'unavailable'} allLabel="Barcha terminallar"
      emptyLabel="Bu merchant uchun terminal mavjud emas"
      errorLabel={draft.merchantId ? 'Terminallarni yuklab bo‘lmadi' : 'Avval merchantni tanlang'}
      hideUnavailableDescription={!draft.merchantId}
      onChange={(id) => onChange({ ...draft, terminalId: id })} />
    {appliedTerminalId ? <p className="text-sm text-text-secondary">Terminal filtri natijasi joriy faol biriktirishni anglatmasligi mumkin.</p> : null}
  </div>
}
