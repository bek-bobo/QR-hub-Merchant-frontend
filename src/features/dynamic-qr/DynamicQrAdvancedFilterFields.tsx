import { Select } from '@/components/ui/select'
import type { QrStatusFilter, TerminalOption } from '@/shared/contracts/merchant-read'
import { parseQrStatusInput } from './page-state'

const statusOptions = [
  { value: '', label: 'Barchasi' },
  { value: '0', label: 'Yangi' },
  { value: '10', label: 'Jarayonda' },
  { value: '50', label: 'Muvaffaqiyatli' },
  { value: '5', label: 'Muddati o‘tgan' },
  { value: '20', label: 'Bekor qilingan' },
] as const

interface DynamicQrAdvancedFilterFieldsProps {
  readonly terminalId?: string
  readonly status?: QrStatusFilter
  readonly terminals?: readonly TerminalOption[]
  readonly terminalsDisabled: boolean
  readonly onTerminalChange: (terminalId: string | undefined) => void
  readonly onStatusChange: (status: QrStatusFilter | undefined) => void
}

export function DynamicQrAdvancedFilterFields({
  terminalId,
  status,
  terminals,
  terminalsDisabled,
  onTerminalChange,
  onStatusChange,
}: DynamicQrAdvancedFilterFieldsProps) {
  return (
    <div className="grid gap-4">
      <label className="block space-y-1.5 text-sm font-medium text-text-primary">
        Terminal
        <Select
          value={terminalId ?? ''}
          disabled={terminalsDisabled}
          onChange={(event) => onTerminalChange(event.target.value || undefined)}
        >
          <option value="">Barcha terminallar</option>
          {terminals?.map((terminal) => (
            <option key={terminal.id} value={terminal.id}>
              {terminal.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1.5 text-sm font-medium text-text-primary">
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
      </label>
    </div>
  )
}
