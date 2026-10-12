import type { P5Presentation } from './presentation'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { P5Row } from '@/shared/contracts/p5-read'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'

interface P5ColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly renderCell: (row: P5Row) => ReactNode
  readonly cellClassName?: string
}

export function createP5Columns(p: P5Presentation) {
  return [
  {
    id: 'deviceId',
    label: p.message('fields.deviceId'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: P5Row) => <MetadataId value={row.deviceId} className="max-w-none whitespace-normal break-all font-semibold" />,
  },
  {
    id: 'description',
    label: p.message('fields.description'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'max-w-72 whitespace-normal break-words',
    renderCell: (row: P5Row) => row.description ?? '—',
  },
  {
    id: 'terminal',
    label: p.message('fields.terminal'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'max-w-64 whitespace-normal break-words',
    renderCell: (row: P5Row) => (
      <>
        <span className="font-semibold text-foreground">{row.terminalName}</span>
        <MetadataId value={row.terminalId} variant="secondary" className="mt-1 max-w-none whitespace-normal break-all font-sans" />
      </>
    ),
  },
  {
    id: 'merchant',
    label: p.message('fields.merchant'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'max-w-56 whitespace-normal break-words',
    renderCell: (row: P5Row) => row.merchantName,
  },
  {
    id: 'status',
    label: p.message('fields.status'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: P5Row) => {
      const status = p.status(row.deviceStatus)
      return (
        <Badge variant="outline" className={`${statusToneClasses[status.tone].badge} h-auto max-w-full whitespace-normal rounded-full px-2.5 py-1 text-center font-medium`}>
          {status.label}
        </Badge>
      )
    },
  },
  {
    id: 'createdAt',
    label: p.message('fields.createdAt'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: P5Row) => p.wallTime(row.createdAt),
  },
] as const satisfies readonly P5ColumnDefinition[]
}


export type P5ColumnId = ReturnType<typeof createP5Columns>[number]['id']
export type P5Column = P5ColumnDefinition & {
  readonly id: P5ColumnId
}


export const P5_DEFAULT_COLUMN_ORDER: readonly P5ColumnId[] =
  ["deviceId","description","terminal","merchant","status","createdAt"]
