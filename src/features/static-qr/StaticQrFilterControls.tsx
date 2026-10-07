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
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault() }
  return <form className="relative w-full min-w-0 sm:w-[min(100%,24rem)]" role="search" onSubmit={submit}>
    <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-secondary" />
    <Input type="text" enterKeyHint="search" value={searchDraft} className="h-10 rounded-xl bg-surface pl-12 pr-10 text-sm"
      aria-label="QR ID bo‘yicha qidirish" placeholder="QR ID bo‘yicha"
      onChange={(event) => onDraftChange(event.target.value)} />
    {searchDraft ? <Button type="button" variant="ghost" size="icon-sm"
      className="absolute right-1 top-1/2 -translate-y-1/2" aria-label="Qidiruvni tozalash"
      onClick={() => onDraftChange('')}><XIcon aria-hidden="true" /></Button> : null}
    <button type="submit" className="sr-only" aria-label="Qidiruvni qo‘llash">Qidiruvni qo‘llash</button>
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
  useEffect(() => { onReconcileDraft?.() }, [onReconcileDraft])
  return <div className="grid min-w-0 gap-4">
    <LookupFilterSelect label="Merchant" value={draft.merchantId} options={merchants} state={merchantState}
      allLabel="Barcha merchantlar" emptyLabel="Merchant mavjud emas" errorLabel="Merchantlarni yuklab bo‘lmadi"
      onChange={(id) => onChange(changeStaticMerchantDraft(draft, id))} />
    <LookupFilterSelect label="Terminal" value={draft.terminalId} options={terminals} state={terminalState}
      allLabel="Barcha terminallar" emptyLabel={draft.merchantId ? 'Bu merchant uchun terminal mavjud emas' : 'Terminal mavjud emas'}
      errorLabel="Terminallarni yuklab bo‘lmadi" onChange={(id) => onChange({ ...draft, terminalId: id })} />
    <LookupFilterSelect label="Viloyat" value={draft.regionId} options={regions} state={regionState}
      allLabel="Barcha viloyatlar" emptyLabel="Viloyat mavjud emas" errorLabel="Viloyatlarni yuklab bo‘lmadi"
      onChange={(id) => onChange(changeStaticRegionDraft(draft, id))} />
    <LookupFilterSelect label="Tuman" value={draft.districtId} options={districts}
      state={draft.regionId ? districtState : 'unavailable'} allLabel="Barcha tumanlar"
      emptyLabel="Bu viloyat uchun tuman mavjud emas"
      errorLabel={draft.regionId ? 'Tumanlarni yuklab bo‘lmadi' : 'Avval viloyatni tanlang'}
      hideUnavailableDescription={!draft.regionId}
      onChange={(id) => onChange({ ...draft, districtId: id })} />
  </div>
}
