import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { TableColumnDefinition } from '@/shared/table-columns/metadata'
import type { StaticQrRow } from './contract'

interface StaticQrColumnDefinition<Id extends string = string>
  extends TableColumnDefinition<Id> {
  readonly renderCell: (row: StaticQrRow) => ReactNode
}

const staticQrColumnDefinitions = [
  {
    id: 'qrId',
    label: 'QR ID',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: StaticQrRow) => <MetadataId value={row.id} className="max-w-none whitespace-normal break-all font-sans text-sm" />,
  },
  {
    id: 'terminal',
    label: 'Terminal',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: StaticQrRow) => row.terminalName,
  },
  {
    id: 'merchant',
    label: 'Merchant',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: StaticQrRow) => row.merchantName,
  },
  {
    id: 'status',
    label: 'Holat',
    defaultVisible: true,
    hideable: true,
    reorderable: true,
    renderCell: (row: StaticQrRow) => {
      const status = presentActiveStatus(row.statusCode)
      return (
        <Badge variant="outline" className={`${statusToneClasses[status.tone].badge} gap-2 rounded-full border-transparent px-3 py-1.5 text-sm font-medium`}>
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${statusToneClasses[status.tone].indicator}`} />
          <span>{status.label}</span>
        </Badge>
      )
    },
  },
] as const satisfies readonly StaticQrColumnDefinition[]

export type StaticQrColumnId = (typeof staticQrColumnDefinitions)[number]['id']
export type StaticQrColumn = StaticQrColumnDefinition & {
  readonly id: StaticQrColumnId
}

export const staticQrColumns: readonly StaticQrColumn[] = staticQrColumnDefinitions

export const STATIC_QR_DEFAULT_COLUMN_ORDER: readonly StaticQrColumnId[] =
  staticQrColumnDefinitions.map((column) => column.id)
