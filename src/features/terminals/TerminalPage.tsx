import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { PageHeader } from '@/shared/ui/PageHeader'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { changeManagementPage, changeMerchantDraft, clearManagementFilters, type LookupState, type TerminalListFilters } from '@/shared/contracts/management-filters'
import type { ManagementOption } from '@/shared/contracts/management-read'
import { applyTerminalDraft, createDefaultTerminalFilters, terminalParentState, type ParentLookupState } from './page-state'
import { TerminalResults } from './TerminalResults'

function lookupState(enabled: boolean, error: boolean, data: readonly ManagementOption[] | undefined, granted: boolean): LookupState {
  if (!enabled) return granted ? 'unavailable' : 'denied'
  if (error) return 'error'
  return data ? 'ready' : 'loading'
}

export function TerminalPage() {
  const runtime = useReadRuntime()
  const [draft, setDraft] = useState<TerminalListFilters>(createDefaultTerminalFilters)
  const [applied, setApplied] = useState<TerminalListFilters>(createDefaultTerminalFilters)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  const merchantBase = runtime.queries.merchantLookupOptions()
  const merchantOptions = { ...merchantBase, enabled: merchantBase.enabled && runtime.capabilities.terminalList }
  const merchants = useQuery(merchantOptions)
  const merchantLookupState: ParentLookupState = !merchantOptions.enabled
    ? { kind: runtime.capabilities.merchantLookup ? 'unavailable' : 'denied' }
    : merchants.isError ? { kind: 'error' }
      : merchants.data ? { kind: 'ready', ids: merchants.data.map((option) => option.id) }
        : { kind: 'loading' }

  const draftBankBase = runtime.queries.bankAccountLookupOptions(draft.merchantId)
  const draftBankOptions = { ...draftBankBase, enabled: draftBankBase.enabled && runtime.capabilities.terminalList && terminalParentState(draft.merchantId, merchantLookupState) === 'ready' }
  const draftBanks = useQuery(draftBankOptions)
  const draftBankState = lookupState(draftBankOptions.enabled, draftBanks.isError, draftBanks.data, runtime.capabilities.bankAccountLookup)

  const appliedParentReady = terminalParentState(applied.merchantId, merchantLookupState) === 'ready'
  const appliedBankBase = runtime.queries.bankAccountLookupOptions(applied.merchantId)
  const appliedBankOptions = { ...appliedBankBase, enabled: appliedBankBase.enabled && runtime.capabilities.terminalList && Boolean(applied.bankAccountId) && appliedParentReady }
  const appliedBanks = useQuery(appliedBankOptions)
  const appliedBankState = lookupState(appliedBankOptions.enabled, appliedBanks.isError, appliedBanks.data, runtime.capabilities.bankAccountLookup)
  const listBase = runtime.queries.terminalListOptions(applied, {
    lookupParentId: applied.merchantId,
    lookupState: appliedBankState,
    optionIds: appliedBanks.data?.map((option) => option.id),
  })
  const listOptions = {
    ...listBase,
    queryKey: appliedParentReady ? listBase.queryKey : [...listBase.queryKey, 'merchant-unconfirmed'],
    enabled: listBase.enabled && appliedParentReady,
  }
  const list = useQuery(listOptions)
  const blocked = !appliedParentReady || (Boolean(applied.bankAccountId) && !listBase.enabled)

  function applyFilters(): boolean {
    try {
      const next = applyTerminalDraft(draft, {
        merchantIds: merchantLookupState.kind === 'ready' ? merchantLookupState.ids : undefined,
        bank: {
          lookupParentId: draft.merchantId,
          lookupState: draftBankState,
          optionIds: draftBanks.data?.map((option) => option.id),
        },
      })
      setDraft(next)
      setApplied(next)
      setValidationMessage(null)
      return true
    } catch {
      setValidationMessage('Tanlangan merchant yoki bank hisobi tasdiqlanmadi. Filtrni yangilang yoki tozalang.')
      return false
    }
  }

  function resetFilters() {
    const next = clearManagementFilters(applied)
    setDraft(next)
    setApplied(next)
    setValidationMessage(null)
  }

  if (!runtime.capabilities.terminalList) return <NoAccessState description="Terminal ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.terminalList.kind === 'unavailable') return <ErrorState title="Terminal integratsiyasi sozlanmagan" />

  return <div className="mx-auto min-w-0 max-w-7xl space-y-5">
    <PageHeader
      title="Terminallar"
      description="Biriktirilgan terminallar ro‘yxati. Qidiruv terminal nomi va terminal ID (pkey) bo‘yicha ishlaydi."
    />
    <FilterDrawer onApply={applyFilters} onReset={resetFilters}>
        {merchantLookupState.kind === 'ready' ? <label className="block min-w-0 space-y-1 text-sm">Merchant
          <Select value={draft.merchantId ?? ''} onChange={(event) => setDraft((current) => changeMerchantDraft(current, event.target.value || undefined))}>
            <option value="">Barcha merchantlar</option>
            {merchants.data?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </Select>
        </label> : null}
        {draftBankState === 'ready' ? <label className="block min-w-0 space-y-1 text-sm">Bank hisobi
          <Select value={draft.bankAccountId ?? ''} onChange={(event) => setDraft((current) => ({ ...current, bankAccountId: event.target.value || undefined }))}>
            <option value="">Barcha bank hisoblari</option>
            {draftBanks.data?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </Select>
        </label> : null}
        <label className="block min-w-0 space-y-1 text-sm">Terminal nomi yoki ID
          <Input value={draft.search} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Terminal nomi yoki pkey" />
        </label>
        {merchantLookupState.kind !== 'ready' ? <p role="status" className="text-sm text-text-secondary sm:col-span-2">Merchant filtri {merchantLookupState.kind === 'denied' ? 'uchun ruxsat yo‘q' : merchantLookupState.kind === 'loading' ? 'yuklanmoqda' : 'hozir mavjud emas'}; {applied.merchantId ? 'qo‘llangan filtr tasdiqlanmaguncha ro‘yxat to‘xtatiladi.' : 'filtrsiz ro‘yxat ishlaydi.'}</p> : null}
        {draftBankState !== 'ready' ? <p role="status" className="text-sm text-text-secondary sm:col-span-2">Bank hisobi filtri {draftBankState === 'denied' ? 'uchun ruxsat yo‘q' : draftBankState === 'loading' ? 'yuklanmoqda' : 'hozir mavjud emas'}.</p> : null}
        {validationMessage ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{validationMessage}</p> : null}
    </FilterDrawer>
    <TerminalResults blocked={blocked} pending={list.isPending} error={list.isError} data={list.data}
      onRetry={() => void list.refetch()}
      onPageChange={(page) => setApplied((current) => changeManagementPage(current, page))} />
  </div>
}
