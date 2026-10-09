import type { StaticQrPresentation } from './presentation'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'
import type { StaticQrRow } from './contract'

interface StaticQrColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly renderCell: (row: StaticQrRow) => ReactNode
}

export function createStaticQrColumns(p: StaticQrPresentation) {
  return [
  {
    id: 'qrId',
    label: p.message('fields.qrId'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: StaticQrRow) => <MetadataId value={row.id} className="max-w-none whitespace-normal break-all font-sans text-sm" />,
  },
  {
    id: 'terminal',
    label: p.message('fields.terminal'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: StaticQrRow) => row.terminalName,
  },
  {
    id: 'merchant',
    label: p.message('fields.merchant'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: StaticQrRow) => row.merchantName,
  },
  {
    id: 'status',
    label: p.message('fields.status'),
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: StaticQrRow) => {
      const status = p.status(row.statusCode)
      return (
        <Badge variant="outline" className={`${statusToneClasses[status.tone].badge} gap-2 rounded-full border-transparent px-3 py-1.5 text-sm font-medium`}>
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${statusToneClasses[status.tone].indicator}`} />
          <span>{status.label}</span>
        </Badge>
      )
    },
  },
] as const satisfies readonly StaticQrColumnDefinition[]
}


export type StaticQrColumnId = ReturnType<typeof createStaticQrColumns>[number]['id']
export type StaticQrColumn = StaticQrColumnDefinition & {
  readonly id: StaticQrColumnId
}


export const STATIC_QR_DEFAULT_COLUMN_ORDER: readonly StaticQrColumnId[] =
  ["qrId","terminal","merchant","status"]
