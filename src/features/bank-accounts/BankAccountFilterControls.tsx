import { useEffect, type FormEvent } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LookupFilterSelect } from '@/shared/ui/LookupFilterSelect'
import type { LookupSelectState } from '@/shared/ui/lookup-select-state'

interface QuickSearchProps {
  readonly searchDraft: string
  readonly onDraftChange: (search: string) => void
  readonly onApply: (search: string) => void
}

export function BankAccountQuickSearch({ searchDraft, onDraftChange, onApply }: QuickSearchProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onApply(searchDraft)
  }
  return <form className="relative w-full min-w-0 sm:w-[25rem]" role="search" onSubmit={submit}>
    <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-secondary" />
    <Input type="text" enterKeyHint="search" value={searchDraft} className="h-10 rounded-xl bg-surface pl-10 pr-9 text-sm"
      aria-label="Nomi, bank, hisob raqami yoki STIR bo‘yicha qidirish"
      placeholder="Nomi, bank, hisob raqami yoki STIR"
      onChange={(event) => onDraftChange(event.target.value)} />
    {searchDraft ? <Button type="button" variant="ghost" size="icon-sm"
      className="absolute right-1 top-1/2 -translate-y-1/2" aria-label="Qidiruvni tozalash"
      onClick={() => { onDraftChange(''); onApply('') }}><XIcon aria-hidden="true" /></Button> : null}
    <button type="submit" className="sr-only" aria-label="Qidiruvni qo‘llash">Qidiruvni qo‘llash</button>
  </form>
}

interface MerchantFilterProps {
  readonly merchantId?: string
  readonly merchants?: readonly { readonly id: string; readonly name: string }[]
  readonly state: LookupSelectState
  readonly onChange: (id?: string) => void
}

export function BankAccountMerchantFilter({ merchantId, merchants, state, onChange }: MerchantFilterProps) {
  const stale = Boolean(merchantId && (state === 'ready' || state === 'empty') &&
    merchants && !merchants.some((item) => item.id === merchantId))
  useEffect(() => { if (stale) onChange(undefined) }, [stale, onChange])
  return <LookupFilterSelect label="Merchant" value={stale ? undefined : merchantId}
    options={merchants} state={state} allLabel="Barcha merchantlar"
    emptyLabel="Merchant mavjud emas" errorLabel="Merchantlarni yuklab bo‘lmadi" onChange={onChange} />
}
