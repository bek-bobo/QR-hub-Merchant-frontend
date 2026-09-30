import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { BankAccountRow } from '@/shared/contracts/management-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'

interface BankAccountColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly renderCell: (row: BankAccountRow) => ReactNode
  readonly cellClassName?: string
}

const bankAccountColumnDefinitions = [
  {
    id: 'name',
    label: 'Nomi',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'font-medium text-foreground',
    renderCell: (row: BankAccountRow) => row.name,
  },
  {
    id: 'bank',
    label: 'Bank',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: BankAccountRow) => row.bankName,
  },
  {
    id: 'accountNumber',
    label: 'Hisob raqami',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: BankAccountRow) => <MetadataId value={row.accountNumber} />,
  },
  {
    id: 'merchant',
    label: 'Merchant',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: BankAccountRow) => row.merchantName,
  },
  {
    id: 'mfo',
    label: 'MFO',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'font-mono text-xs tabular-nums',
    renderCell: (row: BankAccountRow) => row.mfo ?? '—',
  },
  {
    id: 'stir',
    label: 'STIR',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'font-mono text-xs tabular-nums',
    renderCell: (row: BankAccountRow) => row.tin ?? '—',
  },
  {
    id: 'contract',
    label: 'Shartnoma',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: BankAccountRow) => row.contractNumber ?? '—',
  },
  {
    id: 'status',
    label: 'Holat',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: BankAccountRow) => {
      const status = presentActiveStatus(row.statusCode)
      return (
        <Badge variant="outline" className={statusToneClasses[status.tone].badge}>
          {status.label}
        </Badge>
      )
    },
  },
] as const satisfies readonly BankAccountColumnDefinition[]

export type BankAccountColumnId = (typeof bankAccountColumnDefinitions)[number]['id']
export type BankAccountColumn = BankAccountColumnDefinition & {
  readonly id: BankAccountColumnId
}

export const bankAccountColumns: readonly BankAccountColumn[] = bankAccountColumnDefinitions

export const BANK_ACCOUNT_DEFAULT_COLUMN_ORDER: readonly BankAccountColumnId[] =
  bankAccountColumnDefinitions.map((column) => column.id)
