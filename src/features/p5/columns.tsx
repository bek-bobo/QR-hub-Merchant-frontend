import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { P5Row } from '@/shared/contracts/p5-read'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'
import { presentP5Status } from './page-state'

interface P5ColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly renderCell: (row: P5Row) => ReactNode
  readonly cellClassName?: string
}

const p5ColumnDefinitions = [
  {
    id: 'deviceId',
    label: 'Qurilma ID',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: P5Row) => <MetadataId value={row.deviceId} className="max-w-none whitespace-normal break-all font-semibold" />,
  },
  {
    id: 'description',
    label: 'Tavsif',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'max-w-72 whitespace-normal break-words',
    renderCell: (row: P5Row) => row.description ?? '—',
  },
  {
    id: 'terminal',
    label: 'Terminal',
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
    label: 'Merchant',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    cellClassName: 'max-w-56 whitespace-normal break-words',
    renderCell: (row: P5Row) => row.merchantName,
  },
  {
    id: 'status',
    label: 'Qurilma holati',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: P5Row) => {
      const status = presentP5Status(row.deviceStatus)
      return (
        <Badge variant="outline" className={`${statusToneClasses[status.tone].badge} h-auto max-w-full whitespace-normal rounded-full px-2.5 py-1 text-center font-medium`}>
          {status.label}
        </Badge>
      )
    },
  },
  {
    id: 'createdAt',
    label: 'Yaratilgan vaqt',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: P5Row) => formatOffsetlessDateTime(row.createdAt),
  },
] as const satisfies readonly P5ColumnDefinition[]

export type P5ColumnId = (typeof p5ColumnDefinitions)[number]['id']
export type P5Column = P5ColumnDefinition & {
  readonly id: P5ColumnId
}

export const p5Columns: readonly P5Column[] = p5ColumnDefinitions

export const P5_DEFAULT_COLUMN_ORDER: readonly P5ColumnId[] =
  p5ColumnDefinitions.map((column) => column.id)
