import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { CashierRow } from '@/shared/contracts/management-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'

interface CashierColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly renderCell: (row: CashierRow) => ReactNode
  readonly cellClassName?: string
}

const cashierColumnDefinitions = [
  {
    id: 'fullName',
    label: 'F.I.Sh.',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'font-medium text-foreground',
    renderCell: (row: CashierRow) => row.fullname,
  },
  {
    id: 'phone',
    label: 'Telefon',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'tabular-nums',
    renderCell: (row: CashierRow) => row.phone,
  },
  {
    id: 'role',
    label: 'Rol',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: CashierRow) => row.roleDisplay ?? '—',
  },
  {
    id: 'status',
    label: 'Holat',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: CashierRow) => {
      const status = presentActiveStatus(row.statusCode)
      return (
        <Badge variant="outline" className={statusToneClasses[status.tone].badge}>
          {status.label}
        </Badge>
      )
    },
  },
] as const satisfies readonly CashierColumnDefinition[]

export type CashierColumnId = (typeof cashierColumnDefinitions)[number]['id']
export type CashierColumn = CashierColumnDefinition & {
  readonly id: CashierColumnId
}

export const cashierColumns: readonly CashierColumn[] = cashierColumnDefinitions

export const CASHIER_DEFAULT_COLUMN_ORDER: readonly CashierColumnId[] =
  cashierColumnDefinitions.map((column) => column.id)
