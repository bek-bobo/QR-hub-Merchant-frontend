import type { CashierPresentation } from './presentation'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { CashierRow } from '@/shared/contracts/management-read'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'

interface CashierColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly renderCell: (row: CashierRow) => ReactNode
  readonly cellClassName?: string
}

export function createCashierColumns(p: CashierPresentation) {
  return [
  {
    id: 'fullName',
    label: p.message('fields.fullname'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-words font-semibold text-foreground',
    renderCell: (row: CashierRow) => row.fullname,
  },
  {
    id: 'phone',
    label: p.message('fields.phone'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'tabular-nums',
    renderCell: (row: CashierRow) => row.phone,
  },
  {
    id: 'role',
    label: p.message('fields.role'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-words',
    renderCell: (row: CashierRow) => row.roleDisplay ?? '—',
  },
  {
    id: 'status',
    label: p.message('fields.status'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: CashierRow) => {
      const status = p.status(row.statusCode)
      return (
        <Badge variant="outline" className={`${statusToneClasses[status.tone].badge} h-auto max-w-full gap-2 rounded-full px-3 py-1 font-medium whitespace-normal`}>
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${statusToneClasses[status.tone].indicator}`} />
          <span>{status.label}</span>
        </Badge>
      )
    },
  },
] as const satisfies readonly CashierColumnDefinition[]
}


export type CashierColumnId = ReturnType<typeof createCashierColumns>[number]['id']
export type CashierColumn = CashierColumnDefinition & {
  readonly id: CashierColumnId
}


export const CASHIER_DEFAULT_COLUMN_ORDER: readonly CashierColumnId[] =
  ["fullName","phone","role","status"]
