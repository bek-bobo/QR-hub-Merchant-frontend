import type { TerminalPresentation } from './presentation'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'

interface TerminalColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly renderCell: (row: TerminalRow) => ReactNode
  readonly cellClassName?: string
}

export function createTerminalColumns(p: TerminalPresentation) {
  return [
  {
    id: 'terminalId',
    label: p.message('fields.terminalId'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: TerminalRow) => <MetadataId value={row.id} className="max-w-none whitespace-normal break-all font-sans text-sm font-normal" />,
  },
  {
    id: 'merchant',
    label: p.message('fields.merchant'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-words',
    renderCell: (row: TerminalRow) => row.merchantName,
  },
  {
    id: 'name',
    label: p.message('fields.name'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-words font-semibold text-foreground',
    renderCell: (row: TerminalRow) => row.name,
  },
  {
    id: 'bankAccount',
    label: p.message('fields.bank'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'whitespace-normal break-words',
    renderCell: (row: TerminalRow) => row.bankAccountName,
  },
  {
    id: 'status',
    label: p.message('fields.status'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: TerminalRow) => {
      const status = p.status(row.statusCode)
      return (
        <Badge variant="outline" className={`${statusToneClasses[status.tone].badge} h-auto max-w-full gap-1.5 rounded-full px-2.5 py-1 font-medium whitespace-normal`}>
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${statusToneClasses[status.tone].indicator}`} />
          <span>{status.label}</span>
        </Badge>
      )
    },
  },
] as const satisfies readonly TerminalColumnDefinition[]
}


export type TerminalColumnId = ReturnType<typeof createTerminalColumns>[number]['id']
export type TerminalColumn = TerminalColumnDefinition & {
  readonly id: TerminalColumnId
}


export const TERMINAL_DEFAULT_COLUMN_ORDER: readonly TerminalColumnId[] =
  ["terminalId","merchant","name","bankAccount","status"]
