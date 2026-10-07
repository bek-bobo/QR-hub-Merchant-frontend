import { useDebouncedSearch } from '@/shared/filters/debounced-search'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshIconButton } from '@/components/RefreshIconButton'
import { ErrorState, NoAccessState } from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { formatInstantTime } from '@/shared/presentation/date-time'
import { useTableColumnPreferences } from '@/shared/table-columns/useTableColumnPreferences'
import { TableColumnPreferences } from '@/shared/ui/TableColumnPreferences'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { changeManagementPage, type BankAccountListFilters } from '@/shared/contracts/management-filters'
import { applyBankAccountMerchantDraft, applyBankAccountQuickSearch, bankAccountParentState, createDefaultBankAccountFilters, type BankAccountMerchantDraft, type MerchantLookupState } from './page-state'
import { BankAccountMerchantFilter, BankAccountQuickSearch } from './BankAccountFilterControls'
import { resolveLookupSelectState } from '@/shared/ui/lookup-select-state'
import { bankAccountColumns } from './columns'
import { BankAccountResults } from './BankAccountResults'

export function BankAccountPage() {
  const runtime = useReadRuntime()
  const [merchantDraft, setMerchantDraft] = useState<BankAccountMerchantDraft>({})
  const [searchDraft, setSearchDraft] = useState('')
  const [applied, setApplied] = useState<BankAccountListFilters>(createDefaultBankAccountFilters)
  useDebouncedSearch(searchDraft, applied.search, (search) => {
    setApplied((current) => applyBankAccountQuickSearch(current, search))
  })
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const columnPreferences = useTableColumnPreferences({
    tableKey: 'bankAccounts',
    columns: bankAccountColumns,
  })

  const merchantBase = runtime.queries.merchantLookupOptions()
  const merchantOptions = { ...merchantBase, enabled: merchantBase.enabled && runtime.capabilities.bankAccountList }
  const merchants = useQuery(merchantOptions)
  const merchantPresentation = resolveLookupSelectState({ enabled: merchantOptions.enabled,
    pending: merchants.isPending, error: merchants.isError, ids: merchants.data?.map((option) => option.id) })
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
      const next = applyBankAccountMerchantDraft(applied, merchantDraft, merchantLookupState.kind === 'ready' ? merchantLookupState.ids : undefined)
      setMerchantDraft({ merchantId: next.merchantId })
      setApplied(next)
      setValidationMessage(null)
      return true
    } catch {
      setValidationMessage('Tanlangan merchant tasdiqlanmadi. Filtrni yangilang yoki tozalang.')
      return false
    }
  }

  function resetFilters() {
    setMerchantDraft({})
    setValidationMessage(null)
  }


  function syncDrawerDraft(open: boolean) {
    setMerchantDraft(open ? { merchantId: applied.merchantId } : {})
    setValidationMessage(null)
  }

  if (!runtime.capabilities.bankAccountList) return <NoAccessState description="Bank hisoblari ro‘yxatini ko‘rish huquqi mavjud emas." />
  if (runtime.readiness.bankAccountList.kind === 'unavailable') return <ErrorState title="Bank hisoblari integratsiyasi sozlanmagan" />

  return <div className="mx-auto min-w-0 max-w-[96rem]">
    <BankAccountResults blocked={!parentReady} pending={list.isPending} error={list.isError} data={list.data}
      columnOrder={columnPreferences.order}
      visibleColumnIds={columnPreferences.visible}
      onRetry={() => void list.refetch()}
      onPageChange={(page) => setApplied((current) => changeManagementPage(current, page))}
      onPageSizeChange={(size) => setApplied((current) => ({ ...current, size, page: 0 }))}
      quickFilters={<BankAccountQuickSearch searchDraft={searchDraft} onDraftChange={setSearchDraft} />}
      headerActions={<div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <FilterDrawer onApply={applyFilters} onReset={resetFilters} onOpenChange={syncDrawerDraft} triggerSize="sm" triggerClassName="h-10 gap-2 rounded-xl bg-muted/30 px-4 text-sm">
          <BankAccountMerchantFilter merchantId={merchantDraft.merchantId} merchants={merchants.data}
            state={merchantPresentation} onChange={(merchantId) => setMerchantDraft({ merchantId })} />
          {validationMessage ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{validationMessage}</p> : null}
        </FilterDrawer>
        <TableColumnPreferences
          tableLabel="Bank hisoblari"
          items={bankAccountColumns}
          order={columnPreferences.order}
          hidden={columnPreferences.hidden}
          iconOnly
          triggerClassName="size-10 rounded-xl bg-muted/30"
          onMoveUp={columnPreferences.moveUp}
          onMoveDown={columnPreferences.moveDown}
          onMove={columnPreferences.move}
          onToggleVisibility={columnPreferences.toggleVisibility}
          canHide={columnPreferences.canHide}
          onReset={columnPreferences.reset}
        />
        <RefreshIconButton
          className="size-10 rounded-xl bg-muted/30"
          updatedTime={list.dataUpdatedAt > 0 ? formatInstantTime(list.dataUpdatedAt) : '—'}
          disabled={!listOptions.enabled || list.isFetching}
          loading={list.isFetching}
          onClick={() => void list.refetch()}
        />
      </div>} />
  </div>
}
