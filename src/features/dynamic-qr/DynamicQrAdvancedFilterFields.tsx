import { Select } from '@/components/ui/select'
import { useEffect } from 'react'
import { LookupFilterSelect } from '@/shared/ui/LookupFilterSelect'
import { FilterFieldCard } from '@/shared/ui/FilterFieldCard'
import { resolveLookupSelectState, type LookupSelectState } from '@/shared/ui/lookup-select-state'
import type { DistributionStatusFilter, QrStatusFilter, TerminalOption } from '@/shared/contracts/merchant-read'
import { parseQrStatusInput } from './page-state'

const statusOptions = [
  { value: '', label: 'Barchasi' },
  { value: '0', label: 'Yangi' },
  { value: '10', label: 'Jarayonda' },
  { value: '50', label: 'Muvaffaqiyatli' },
  { value: '5', label: 'Muddati o‘tgan' },
  { value: '20', label: 'Bekor qilingan' },
  { value: '25', label: 'Rad etilgan' },
] as const

const distributionOptions = [
  { value: '', label: 'Barchasi' },
  { value: '0', label: 'Yaratildi' },
  { value: '5', label: 'Eskirdi' },
  { value: '10', label: 'Jarayonda' },
  { value: '20', label: 'Rad etildi' },
  { value: '50', label: 'Muvaffaqiyatli' },
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
  useEffect(() => { onReconcileDraft?.() }, [onReconcileDraft])
  const fallbackState = (disabled: boolean, items: readonly TerminalOption[] | undefined) =>
    resolveLookupSelectState({ enabled: !disabled, pending: !items, error: false, ids: items?.map((item) => item.id) })
  return (
    <div className="grid min-w-0 gap-4">
      <LookupFilterSelect label="Merchant" value={merchantId} options={merchants}
        state={merchantLookupState ?? fallbackState(merchantsDisabled, merchants)}
        allLabel="Barcha merchantlar" emptyLabel="Merchant mavjud emas"
        errorLabel="Merchantlarni yuklab bo‘lmadi" onChange={onMerchantChange} />
      <LookupFilterSelect label="Bank hisobi" value={bankAccountId} options={banks}
        state={bankLookupState ?? fallbackState(banksDisabled, banks)}
        allLabel="Barcha bank hisoblari"
        emptyLabel={merchantId ? 'Bu merchant uchun bank hisobi mavjud emas' : 'Bank hisobi mavjud emas'}
        errorLabel="Bank hisoblarini yuklab bo‘lmadi" onChange={onBankAccountChange} />
      <FilterFieldCard><label className="block space-y-1.5 text-sm font-medium text-text-primary">
        Terminal
        <Select
          value={terminalId ?? ''}
          disabled={terminalsDisabled && !terminalId}
          onChange={(event) => onTerminalChange(event.target.value || undefined)}
        >
          <option value="">Barcha terminallar</option>
          {terminalId && !terminals?.some((item) => item.id === terminalId) ? <option value={terminalId}>Tanlovni tozalang</option> : null}
          {terminals?.map((terminal) => (
            <option key={terminal.id} value={terminal.id}>
              {terminal.name}
            </option>
          ))}
        </Select>
      </label></FilterFieldCard>
      <FilterFieldCard><label className="block space-y-1.5 text-sm font-medium text-text-primary">
        Status
        <Select
          value={status === undefined ? '' : String(status)}
          onChange={(event) => onStatusChange(parseQrStatusInput(event.target.value))}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label></FilterFieldCard>
      <FilterFieldCard><label className="block space-y-1.5 text-sm font-medium text-text-primary">Tarqatish holati
        <Select value={distributionStatus === undefined ? '' : String(distributionStatus)}
          onChange={(event) => onDistributionStatusChange(event.target.value === '' ? undefined : Number(event.target.value) as DistributionStatusFilter)}>
          {distributionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </label></FilterFieldCard>
    </div>
  )
}
