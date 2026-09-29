import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page } from '@/shared/contracts/merchant-read'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'

interface TerminalResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<TerminalRow>
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
}

export function TerminalResults({ blocked, pending, error, data, onRetry, onPageChange }: TerminalResultsProps) {
  if (blocked) return <ErrorState title="Qo‘llangan filtr tasdiqlanmadi" description="Merchant yoki bank hisobini qayta tanlab qo‘llang yoki filtrni tozalang." />
  if (pending) return <LoadingState title="Terminallar yuklanmoqda" />
  if (error) return <ErrorState onRetry={onRetry} />
  if (!data) return <ErrorState title="Terminal ro‘yxatini ko‘rsatib bo‘lmadi" />

  return <div className="min-w-0 space-y-4">
    {data.content.length === 0 ? <EmptyState description="Terminal topilmadi." />
      : <Card className="min-w-0"><CardContent className="min-w-0 p-0">
        <TableScrollRegion ariaLabel="Terminal jadvali">
          <Table className="min-w-[40rem]">
            <TableHeader><TableRow><TableHead>Terminal ID</TableHead><TableHead>Nomi</TableHead><TableHead>Merchant</TableHead><TableHead>Bank hisobi</TableHead><TableHead>Holat</TableHead></TableRow></TableHeader>
            <TableBody>{data.content.map((row, index) => {
              const status = presentActiveStatus(row.statusCode)
              return <TableRow key={`${row.id}-${index}`}>
                <TableCell><MetadataId value={row.id} /></TableCell><TableCell className="font-medium text-foreground">{row.name}</TableCell><TableCell>{row.merchantName}</TableCell><TableCell>{row.bankAccountName}</TableCell><TableCell><Badge variant="outline" className={statusToneClasses[status.tone].badge}>{status.label}</Badge></TableCell>
              </TableRow>
            })}</TableBody>
          </Table>
        </TableScrollRegion>
      </CardContent></Card>}
    <PaginationBar ariaLabel="Terminal sahifalari" currentPage={data.page}
      totalPages={data.totalPages} totalItems={data.totalElements}
      onPageChange={onPageChange} />
  </div>
}
