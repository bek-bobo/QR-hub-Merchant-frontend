import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'

interface TerminalColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly renderCell: (row: TerminalRow) => ReactNode
  readonly cellClassName?: string
}

const terminalColumnDefinitions = [
  {
    id: 'terminalId',
    label: 'Terminal ID',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: TerminalRow) => <MetadataId value={row.id} />,
  },
  {
    id: 'name',
    label: 'Nomi',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'font-medium text-foreground',
    renderCell: (row: TerminalRow) => row.name,
  },
  {
    id: 'merchant',
    label: 'Merchant',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: TerminalRow) => row.merchantName,
  },
  {
    id: 'bankAccount',
    label: 'Bank hisobi',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: TerminalRow) => row.bankAccountName,
  },
  {
    id: 'status',
    label: 'Holat',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: TerminalRow) => {
      const status = presentActiveStatus(row.statusCode)
      return (
        <Badge variant="outline" className={statusToneClasses[status.tone].badge}>
          {status.label}
        </Badge>
      )
    },
  },
] as const satisfies readonly TerminalColumnDefinition[]

export type TerminalColumnId = (typeof terminalColumnDefinitions)[number]['id']
export type TerminalColumn = TerminalColumnDefinition & {
  readonly id: TerminalColumnId
}

export const terminalColumns: readonly TerminalColumn[] = terminalColumnDefinitions

export const TERMINAL_DEFAULT_COLUMN_ORDER: readonly TerminalColumnId[] =
  terminalColumnDefinitions.map((column) => column.id)
