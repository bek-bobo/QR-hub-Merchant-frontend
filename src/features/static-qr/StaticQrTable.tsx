import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import type { StaticQrRow } from './contract'
import { StaticQrActionsMenu } from './StaticQrActionsMenu'

interface StaticQrTableProps {
  readonly rows: readonly StaticQrRow[]
  readonly onViewQr: (row: StaticQrRow) => void
  readonly onViewDetails: (row: StaticQrRow) => void
}

export function StaticQrTable({ rows, onViewQr, onViewDetails }: StaticQrTableProps) {
  return (
    <Table className="min-w-[38rem]">
      <TableHeader>
        <TableRow>
          <TableHead>QR ID</TableHead>
          <TableHead>Terminal</TableHead>
          <TableHead>Merchant</TableHead>
          <TableHead>Holat</TableHead>
          <TableHead className="sticky right-0 w-16 bg-surface text-right">Amallar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const status = presentActiveStatus(row.statusCode)
          return (
            <TableRow key={row.id}>
              <TableCell><MetadataId value={row.id} /></TableCell>
              <TableCell>{row.terminalName}</TableCell>
              <TableCell>{row.merchantName}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusToneClasses[status.tone].badge}>
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell className="sticky right-0 bg-surface text-right">
                <StaticQrActionsMenu row={row} onViewQr={onViewQr} onViewDetails={onViewDetails} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
