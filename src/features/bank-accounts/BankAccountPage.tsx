import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { PageHeader } from '@/shared/ui/PageHeader'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { changeManagementPage, clearManagementFilters, type BankAccountListFilters } from '@/shared/contracts/management-filters'
import { applyBankAccountDraft, bankAccountParentState, createDefaultBankAccountFilters, type MerchantLookupState } from './page-state'
import { BankAccountResults } from './BankAccountResults'

export function BankAccountPage() {
  const runtime = useReadRuntime()
  const [draft, setDraft] = useState<BankAccountListFilters>(createDefaultBankAccountFilters)
  const [applied, setApplied] = useState<BankAccountListFilters>(createDefaultBankAccountFilters)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  const merchantBase = runtime.queries.merchantLookupOptions()
  const merchantOptions = { ...merchantBase, enabled: merchantBase.enabled && runtime.capabilities.bankAccountList }
  const merchants = useQuery(merchantOptions)
  const merchantLookupState: MerchantLookupState = !merchantOptions.enabled
    ? { kind: runtime.capabilities.merchantLookup ? 'unavailable' : 'denied' }
    : merchants.isError ? { kind: 'error' }
      : merchants.data ? { kind: 'ready', ids: merchants.data.map((option) => option.id) }
        : { kind: 'loading' }

  const parentReady = bankAccountParentState(applied.merchantId, merchantLookupState) === 'ready'
  const listBase = runtime.queries.bankAccountListOptions(applied)
  const listOptions = {
    ...listBase,
    queryKey: parentReady ? listBase.queryKey : [...listBase.queryKey, 'merchant-unconfirmed'],
    enabled: listBase.enabled && parentReady,
  }
  const list = useQuery(listOptions)

  function applyFilters(): boolean {
    try {
      const next = applyBankAccountDraft(draft, merchantLookupState.kind === 'ready' ? merchantLookupState.ids : undefined)
      setDraft(next)
      setApplied(next)
      setValidationMessage(null)
      return true
    } catch {
      setValidationMessage('Tanlangan merchant tasdiqlanmadi. Filtrni yangilang yoki tozalang.')
      return false
    }
  }

  function resetFilters() {
    const next = clearManagementFilters(applied)
    setDraft(next)
    setApplied(next)
    setValidationMessage(null)
  }

  if (!runtime.capabilities.bankAccountList) return <NoAccessState description="Bank hisoblari ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.bankAccountList.kind === 'unavailable') return <ErrorState title="Bank hisoblari integratsiyasi sozlanmagan" />

  return <div className="mx-auto min-w-0 max-w-7xl space-y-5">
    <PageHeader
      title="Bank hisoblari"
      description="Qidiruv hisob nomi, bank nomi, hisob raqami va STIR bo‘yicha ishlaydi."
    />
    <FilterDrawer onApply={applyFilters} onReset={resetFilters}>
        {merchantLookupState.kind === 'ready' ? <label className="block min-w-0 space-y-1 text-sm">Merchant
          <Select value={draft.merchantId ?? ''} onChange={(event) => setDraft((current) => ({ ...current, merchantId: event.target.value || undefined }))}>
            <option value="">Barcha merchantlar</option>
            {merchants.data?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </Select>
        </label> : null}
        <label className="block min-w-0 space-y-1 text-sm">Hisob nomi, bank nomi, hisob raqami yoki STIR
          <Input value={draft.search} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Nomi, bank, hisob raqami yoki STIR" />
        </label>
        {merchantLookupState.kind !== 'ready' ? <p role="status" className="text-sm text-text-secondary sm:col-span-2">Merchant filtri {merchantLookupState.kind === 'denied' ? 'uchun ruxsat yo‘q' : merchantLookupState.kind === 'loading' ? 'yuklanmoqda' : 'hozir mavjud emas'}; {applied.merchantId ? 'qo‘llangan filtr tasdiqlanmaguncha ro‘yxat to‘xtatiladi.' : 'filtrsiz ro‘yxat ishlaydi.'}</p> : null}
        {validationMessage ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{validationMessage}</p> : null}
    </FilterDrawer>
    <BankAccountResults blocked={!parentReady} pending={list.isPending} error={list.isError} data={list.data}
      onRetry={() => void list.refetch()}
      onPageChange={(page) => setApplied((current) => changeManagementPage(current, page))} />
  </div>
}
