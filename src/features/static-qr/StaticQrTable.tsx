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

export function StaticQrTable({ rows }: { readonly rows: readonly StaticQrRow[] }) {
  return (
    <Table className="min-w-[38rem]">
      <TableHeader>
        <TableRow>
          <TableHead>QR ID</TableHead>
          <TableHead>Terminal</TableHead>
          <TableHead>Merchant</TableHead>
          <TableHead>Holat</TableHead>
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
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
