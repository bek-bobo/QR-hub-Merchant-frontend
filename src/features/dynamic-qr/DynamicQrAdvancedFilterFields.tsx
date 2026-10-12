import { useDynamicQrPresentation } from './presentation'
import { Select } from '@/components/ui/select'
import { useEffect } from 'react'
import { LookupFilterSelect } from '@/shared/ui/LookupFilterSelect'
import { FilterFieldCard } from '@/shared/ui/FilterFieldCard'
import { resolveLookupSelectState, type LookupSelectState } from '@/shared/ui/lookup-select-state'
import type { DistributionStatusFilter, QrStatusFilter, TerminalOption } from '@/shared/contracts/merchant-read'
import { parseQrStatusInput } from './page-state'

const statusOptions = [
  { value: '', key: 'filters.all' },
  { value: '0', key: 'status.new' },
  { value: '10', key: 'status.processing' },
  { value: '50', key: 'status.success' },
  { value: '5', key: 'status.expired' },
  { value: '20', key: 'status.cancelled' },
  { value: '25', key: 'status.rejected' },
] as const

const distributionOptions = [
  { value: '', key: 'filters.all' },
  { value: '0', key: 'distribution.created' },
  { value: '5', key: 'distribution.expired' },
  { value: '10', key: 'status.processing' },
  { value: '20', key: 'distribution.rejected' },
  { value: '50', key: 'status.success' },
] as const

export interface DynamicQrAdvancedFilterFieldsProps {
  readonly merchantId?: string
  readonly bankAccountId?: string
  readonly distributionStatus?: DistributionStatusFilter
  readonly merchants?: readonly TerminalOption[]
  readonly banks?: readonly TerminalOption[]
  readonly merchantsDisabled: boolean
  readonly banksDisabled: boolean
  readonly merchantLookupState?: LookupSelectState
  readonly bankLookupState?: LookupSelectState
  readonly onReconcileDraft?: () => void
  readonly onMerchantChange: (id?: string) => void
  readonly onBankAccountChange: (id?: string) => void
  readonly onDistributionStatusChange: (status?: DistributionStatusFilter) => void
  readonly terminalId?: string
  readonly status?: QrStatusFilter
  readonly terminals?: readonly TerminalOption[]
  readonly terminalsDisabled: boolean
  readonly onTerminalChange: (terminalId: string | undefined) => void
  readonly onStatusChange: (status: QrStatusFilter | undefined) => void
}

export function DynamicQrAdvancedFilterFields({
  merchantId, bankAccountId, distributionStatus, merchants, banks,
  merchantsDisabled, banksDisabled, onMerchantChange, onBankAccountChange, onDistributionStatusChange,
  merchantLookupState, bankLookupState, onReconcileDraft,
  terminalId,
  status,
  terminals,
  terminalsDisabled,
  onTerminalChange,
  onStatusChange,
}: DynamicQrAdvancedFilterFieldsProps) {
  const p = useDynamicQrPresentation()
  useEffect(() => { onReconcileDraft?.() }, [onReconcileDraft])
  const fallbackState = (disabled: boolean, items: readonly TerminalOption[] | undefined) =>
    resolveLookupSelectState({ enabled: !disabled, pending: !items, error: false, ids: items?.map((item) => item.id) })
  return (
    <div className="grid min-w-0 gap-4">
      <LookupFilterSelect label={p.message('table.merchant')} value={merchantId} options={merchants}
        state={merchantLookupState ?? fallbackState(merchantsDisabled, merchants)}
        allLabel={p.message('filters.allMerchants')} emptyLabel={p.message('filters.noMerchants')}
        errorLabel={p.message('filters.merchantsFailed')} onChange={onMerchantChange} />
      <LookupFilterSelect label={p.message('table.bank')} value={bankAccountId} options={banks}
        state={bankLookupState ?? fallbackState(banksDisabled, banks)}
        allLabel={p.message('filters.allBanks')}
        emptyLabel={merchantId ? p.message('filters.noMerchantBanks') : p.message('filters.noBanks')}
        errorLabel={p.message('filters.banksFailed')} onChange={onBankAccountChange} />
      <FilterFieldCard><label className="block space-y-1.5 text-sm font-medium text-text-primary">
        {p.message('table.terminal')}<Select
          value={terminalId ?? ''}
          disabled={terminalsDisabled && !terminalId}
          onChange={(event) => onTerminalChange(event.target.value || undefined)}
        >
          <option value="">{p.message('filters.allTerminals')}</option>
          {terminalId && !terminals?.some((item) => item.id === terminalId) ? <option value={terminalId}>{p.message('filters.clearSelection')}</option> : null}
          {terminals?.map((terminal) => (
            <option key={terminal.id} value={terminal.id}>
              {terminal.name}
            </option>
          ))}
        </Select>
      </label></FilterFieldCard>
      <FilterFieldCard><label className="block space-y-1.5 text-sm font-medium text-text-primary">
        {p.message('table.status')}<Select
          value={status === undefined ? '' : String(status)}
          onChange={(event) => onStatusChange(parseQrStatusInput(event.target.value))}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {p.message(option.key)}
            </option>
          ))}
        </Select>
      </label></FilterFieldCard>
      <FilterFieldCard><label className="block space-y-1.5 text-sm font-medium text-text-primary">{p.message('filters.distribution')}<Select value={distributionStatus === undefined ? '' : String(distributionStatus)}
          onChange={(event) => onDistributionStatusChange(event.target.value === '' ? undefined : Number(event.target.value) as DistributionStatusFilter)}>
          {distributionOptions.map((option) => <option key={option.value} value={option.value}>{p.message(option.key)}</option>)}
        </Select>
      </label></FilterFieldCard>
    </div>
  )
}
