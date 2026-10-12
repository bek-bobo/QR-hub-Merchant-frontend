import type { BankAccountPresentation } from './presentation'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { BankAccountRow } from '@/shared/contracts/management-read'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'

interface BankAccountColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly renderCell: (row: BankAccountRow) => ReactNode
  readonly cellClassName?: string
}

export function createBankAccountColumns(p: BankAccountPresentation) {
  return [
  {
    id: 'name',
    label: p.message('fields.name'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-words font-semibold text-foreground',
    renderCell: (row: BankAccountRow) => row.name,
  },
  {
    id: 'bank',
    label: p.message('fields.bank'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-words',
    renderCell: (row: BankAccountRow) => row.bankName,
  },
  {
    id: 'accountNumber',
    label: p.message('fields.account'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: BankAccountRow) => <MetadataId value={row.accountNumber} className="max-w-none whitespace-normal break-all font-sans text-sm font-normal tabular-nums" />,
  },
  {
    id: 'merchant',
    label: p.message('fields.merchant'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-words',
    renderCell: (row: BankAccountRow) => row.merchantName,
  },
  {
    id: 'mfo',
    label: p.message('fields.mfo'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-all tabular-nums',
    renderCell: (row: BankAccountRow) => row.mfo ?? '—',
  },
  {
    id: 'stir',
    label: p.message('fields.tin'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-all tabular-nums',
    renderCell: (row: BankAccountRow) => row.tin ?? '—',
  },
  {
    id: 'contract',
    label: p.message('fields.contract'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-words',
    renderCell: (row: BankAccountRow) => row.contractNumber ?? '—',
  },
  {
    id: 'status',
    label: p.message('fields.status'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: BankAccountRow) => {
      const status = p.status(row.statusCode)
      return (
        <Badge variant="outline" className={`${statusToneClasses[status.tone].badge} h-auto max-w-full gap-1.5 rounded-full px-2.5 py-1 font-medium whitespace-normal`}>
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${statusToneClasses[status.tone].indicator}`} />
          <span>{status.label}</span>
        </Badge>
      )
    },
  },
] as const satisfies readonly BankAccountColumnDefinition[]
}


export type BankAccountColumnId = ReturnType<typeof createBankAccountColumns>[number]['id']
export type BankAccountColumn = BankAccountColumnDefinition & {
  readonly id: BankAccountColumnId
}


export const BANK_ACCOUNT_DEFAULT_COLUMN_ORDER: readonly BankAccountColumnId[] =
  ["name","bank","accountNumber","merchant","mfo","stir","contract","status"]
