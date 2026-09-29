import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/AsyncState'
import type { Page } from '@/shared/contracts/merchant-read'
import type { BankAccountRow } from '@/shared/contracts/management-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'

interface BankAccountResultsProps {
  readonly blocked: boolean
  readonly pending: boolean
  readonly error: boolean
  readonly data?: Page<BankAccountRow>
  readonly onRetry: () => void
  readonly onPageChange: (page: number) => void
  readonly headerActions?: ReactNode
}

export function BankAccountResults({ blocked, pending, error, data, onRetry, onPageChange, headerActions }: BankAccountResultsProps) {
  return <Card className="min-w-0" aria-busy={pending}>
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle>Bank hisoblari ro‘yxati</CardTitle>
      {headerActions}
    </CardHeader>
    <CardContent className="min-w-0 space-y-4">
      {blocked ? <ErrorState title="Qo‘llangan merchant filtri tasdiqlanmadi" description="Merchantni qayta tanlab qo‘llang yoki filtrni tozalang." />
        : pending ? <LoadingState title="Bank hisoblari yuklanmoqda" />
          : error ? <ErrorState onRetry={onRetry} />
            : !data ? <ErrorState title="Bank hisoblari ro‘yxatini ko‘rsatib bo‘lmadi" />
              : data.content.length === 0 ? <EmptyState description="Bank hisobi topilmadi." />
                : <div className="min-w-0">
        <TableScrollRegion ariaLabel="Bank hisoblari jadvali">
          <Table className="min-w-[64rem]">
            <TableHeader><TableRow><TableHead>Nomi</TableHead><TableHead>Bank</TableHead><TableHead>Hisob raqami</TableHead><TableHead>Merchant</TableHead><TableHead>MFO</TableHead><TableHead>STIR</TableHead><TableHead>Shartnoma</TableHead><TableHead>Holat</TableHead></TableRow></TableHeader>
            <TableBody>{data.content.map((row, index) => {
              const status = presentActiveStatus(row.statusCode)
              return <TableRow key={`${row.id}-${index}`}>
                <TableCell className="font-medium text-foreground">{row.name}</TableCell><TableCell>{row.bankName}</TableCell><TableCell><MetadataId value={row.accountNumber} /></TableCell><TableCell>{row.merchantName}</TableCell><TableCell className="font-mono text-xs tabular-nums">{row.mfo ?? '—'}</TableCell><TableCell className="font-mono text-xs tabular-nums">{row.tin ?? '—'}</TableCell><TableCell>{row.contractNumber ?? '—'}</TableCell><TableCell><Badge variant="outline" className={statusToneClasses[status.tone].badge}>{status.label}</Badge></TableCell>
              </TableRow>
            })}</TableBody>
          </Table>
        </TableScrollRegion>
      </div>}
      {data && !blocked && !pending && !error ? <PaginationBar ariaLabel="Bank hisoblari sahifalari" currentPage={data.page}
        totalPages={data.totalPages} totalItems={data.totalElements} showTotal={false}
        onPageChange={onPageChange} /> : null}
    </CardContent>
  </Card>
}
