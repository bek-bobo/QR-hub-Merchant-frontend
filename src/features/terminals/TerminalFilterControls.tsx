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
  readonly onApply: (search: string) => void
}

export function TerminalQuickSearch({ searchDraft, onDraftChange, onApply }: QuickSearchProps) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onApply(searchDraft) }
  return <form className="relative w-full min-w-0 sm:w-80" role="search" onSubmit={submit}>
    <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
    <Input type="text" enterKeyHint="search" value={searchDraft} className="h-9 pl-9 pr-9"
      aria-label="Terminal nomi yoki ID bo‘yicha qidirish" placeholder="Terminal nomi yoki ID"
      onChange={(event) => onDraftChange(event.target.value)} />
    {searchDraft ? <Button type="button" variant="ghost" size="icon-sm"
      className="absolute right-1 top-1/2 -translate-y-1/2" aria-label="Qidiruvni tozalash"
      onClick={() => { onDraftChange(''); onApply('') }}><XIcon aria-hidden="true" /></Button> : null}
    <button type="submit" className="sr-only" aria-label="Qidiruvni qo‘llash">Qidiruvni qo‘llash</button>
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
  useEffect(() => { onReconcileDraft?.() }, [onReconcileDraft])
  return <div className="grid min-w-0 gap-4">
    <LookupFilterSelect label="Merchant" value={draft.merchantId} options={merchants} state={merchantState}
      allLabel="Barcha merchantlar" emptyLabel="Merchant mavjud emas" errorLabel="Merchantlarni yuklab bo‘lmadi"
      onChange={(id) => onChange(changeTerminalMerchantDraft(draft, id))} />
    <LookupFilterSelect label="Bank hisobi" value={draft.bankAccountId} options={banks} state={bankState}
      allLabel="Barcha bank hisoblari" emptyLabel={draft.merchantId ? 'Bu merchant uchun bank hisobi mavjud emas' : 'Bank hisobi mavjud emas'}
      errorLabel="Bank hisoblarini yuklab bo‘lmadi" onChange={(id) => onChange({ ...draft, bankAccountId: id })} />
    <LookupFilterSelect label="Viloyat" value={draft.regionId} options={regions} state={regionState}
      allLabel="Barcha viloyatlar" emptyLabel="Viloyat mavjud emas" errorLabel="Viloyatlarni yuklab bo‘lmadi"
      onChange={(id) => onChange(changeTerminalRegionDraft(draft, id))} />
    <LookupFilterSelect label="Tuman" value={draft.districtId} options={districts}
      state={draft.regionId ? districtState : 'unavailable'} allLabel="Barcha tumanlar"
      emptyLabel="Bu viloyat uchun tuman mavjud emas"
      errorLabel={draft.regionId ? 'Tumanlarni yuklab bo‘lmadi' : 'Avval viloyatni tanlang'}
      hideUnavailableDescription={!draft.regionId}
      onChange={(id) => onChange({ ...draft, districtId: id })} />
  </div>
}
