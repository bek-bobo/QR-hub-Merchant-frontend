import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { presentQrStatus } from '@/features/dashboard/presenters'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import { presentNullableCell } from './page-state'

interface DynamicQrTableProps {
  readonly rows: readonly DynamicQrRow[]
}

export function DynamicQrTable({ rows }: DynamicQrTableProps) {
  return (
    <TableScrollRegion ariaLabel="Dinamik QR ro‘yxati">
      <Table className="min-w-[60rem]">
        <TableHeader>
          <TableRow>
            <TableHead>QR ID</TableHead>
            <TableHead>Yaratilgan vaqt</TableHead>
            <TableHead>Terminal</TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead className="text-right">Summa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>RRN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const status = presentQrStatus(row.statusCode)
            return (
              <TableRow key={row.pkey}>
                <TableCell><MetadataId value={row.pkey} /></TableCell>
                <TableCell>{formatOffsetlessDateTime(row.createdAt)}</TableCell>
                <TableCell>{presentNullableCell(row.terminalName)}</TableCell>
                <TableCell>{presentNullableCell(row.merchantName)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(row.amount)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusToneClasses[status.tone].badge}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>{presentNullableCell(row.rrn)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableScrollRegion>
  )
}
