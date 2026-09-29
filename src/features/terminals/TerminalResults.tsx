import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  readonly headerActions?: ReactNode
}

export function TerminalResults({ blocked, pending, error, data, onRetry, onPageChange, headerActions }: TerminalResultsProps) {
  return <Card className="min-w-0" aria-busy={pending}>
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle>Terminallar ro‘yxati</CardTitle>
      {headerActions}
    </CardHeader>
    <CardContent className="min-w-0 space-y-4">
      {blocked ? <ErrorState title="Qo‘llangan filtr tasdiqlanmadi" description="Merchant yoki bank hisobini qayta tanlab qo‘llang yoki filtrni tozalang." />
        : pending ? <LoadingState title="Terminallar yuklanmoqda" />
          : error ? <ErrorState onRetry={onRetry} />
            : !data ? <ErrorState title="Terminal ro‘yxatini ko‘rsatib bo‘lmadi" />
              : data.content.length === 0 ? <EmptyState description="Terminal topilmadi." />
                : <div className="min-w-0">
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
      </div>}
      {data && !blocked && !pending && !error ? <PaginationBar ariaLabel="Terminal sahifalari" currentPage={data.page}
        totalPages={data.totalPages} totalItems={data.totalElements} showTotal={false}
        onPageChange={onPageChange} /> : null}
    </CardContent>
  </Card>
}
