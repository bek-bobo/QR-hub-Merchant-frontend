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
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { presentNullableCell } from './page-state'

interface DynamicQrTableProps {
  readonly rows: readonly DynamicQrRow[]
}

export function DynamicQrTable({ rows }: DynamicQrTableProps) {
  return (
    <div
      role="region"
      aria-label="Dinamik QR ro‘yxati"
      tabIndex={0}
      className="w-full min-w-0 max-w-full overflow-x-auto"
    >
      <Table className="min-w-[60rem]">
        <TableHeader>
          <TableRow>
            <TableHead>QR ID</TableHead>
            <TableHead>Yaratilgan vaqt</TableHead>
            <TableHead>Terminal</TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead>Summa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>RRN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const status = presentQrStatus(row.statusCode)
            return (
              <TableRow key={row.pkey}>
                <TableCell className="max-w-60 truncate font-medium text-text-primary">
                  {row.pkey}
                </TableCell>
                <TableCell>{formatOffsetlessDateTime(row.createdAt)}</TableCell>
                <TableCell>{presentNullableCell(row.terminalName)}</TableCell>
                <TableCell>{presentNullableCell(row.merchantName)}</TableCell>
                <TableCell>{formatMoney(row.amount)}</TableCell>
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
    </div>
  )
}
