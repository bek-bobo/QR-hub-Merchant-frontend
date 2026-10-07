import { useState } from 'react'
import {
  CircleCheckIcon,
  CircleHelpIcon,
  CircleIcon,
  CircleXIcon,
  ClockAlertIcon,
  LoaderCircleIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { TableScrollRegion } from '@/shared/ui/TableScrollRegion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPreviewTiyin } from './format'
import type { PreviewQrRow } from './model'
import { presentQrStatus } from '@/shared/presentation/qr-status'

const statusOptions = [
  { code: 0, label: 'Yangi' },
  { code: 10, label: 'Jarayonda' },
  { code: 50, label: 'Muvaffaqiyatli' },
  { code: 5, label: 'Muddati o‘tgan' },
  { code: 20, label: 'Bekor qilingan' },
] as const

function StatusIcon({ statusCode }: { statusCode: number }) {
  switch (statusCode) {
    case 0:
      return <CircleIcon aria-hidden="true" />
    case 10:
      return <LoaderCircleIcon aria-hidden="true" />
    case 50:
      return <CircleCheckIcon aria-hidden="true" />
    case 5:
      return <ClockAlertIcon aria-hidden="true" />
    case 20:
    case 25:
      return <CircleXIcon aria-hidden="true" />
    default:
      return <CircleHelpIcon aria-hidden="true" />
  }
}

function StatusBadge({ statusCode }: { statusCode: number }) {
  const status = presentQrStatus(statusCode)

  return (
    <Badge variant="outline" className={statusToneClasses[status.tone].badge}>
      <StatusIcon statusCode={statusCode} />
      {status.label}
    </Badge>
  )
}

interface PreviewQrTableProps {
  rows: readonly PreviewQrRow[]
}

export function PreviewQrTable({ rows }: PreviewQrTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const normalizedSearch = search.trim().toLocaleLowerCase('uz-UZ')
  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      row.demoId.toLocaleLowerCase('uz-UZ').includes(normalizedSearch) ||
      row.terminalName.toLocaleLowerCase('uz-UZ').includes(normalizedSearch)
    const matchesStatus =
      statusFilter === 'all' || row.statusCode === Number(statusFilter)

    return matchesSearch && matchesStatus
  })
  const hasActiveFilters = search.length > 0 || statusFilter !== 'all'

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
  }

  return (
    <Card className="min-w-0 max-w-full">
      <CardHeader>
        <CardTitle>Dinamik QR — namuna ro‘yxati</CardTitle>
        <CardDescription>
          Sintetik preview yozuvlari; bu backend javobi emas.
        </CardDescription>
      </CardHeader>

      <CardContent className="min-w-0 max-w-full space-y-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[minmax(0,1fr)_13rem_auto] md:items-end">
          <label className="space-y-1.5 text-sm font-medium text-text-primary">
            QR ID yoki terminal
            <Input
              type="search"
              value={search}
              placeholder="Namuna ro‘yxatidan qidirish"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium text-text-primary">
            Status
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Barcha statuslar</option>
              {statusOptions.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </Select>
          </label>

          <Button
            type="button"
            variant="outline"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            Tozalash
          </Button>
        </div>

        <p className="text-sm text-text-secondary" aria-live="polite">
          {filteredRows.length} ta namuna yozuvi ko‘rsatilmoqda.
        </p>

        <p id="preview-table-help" className="text-sm text-text-secondary">
          Filtrlar faqat namuna ro‘yxatiga ta’sir qiladi. Yuqoridagi
          ko‘rsatkichlar to‘liq namuna bo‘yicha o‘zgarmaydi.
        </p>

        <TableScrollRegion
          ariaLabel="Dinamik QR namuna jadvali"
          ariaDescribedBy="preview-table-help"
        >
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>QR ID</TableHead>
                <TableHead>Terminal</TableHead>
                <TableHead>Vaqt</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-text-secondary">
                    Mos namuna yozuvi topilmadi.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.demoId}>
                    <TableCell className="font-medium text-text-primary">
                      {row.demoId}
                    </TableCell>
                    <TableCell>{row.terminalName}</TableCell>
                    <TableCell>{row.createdAtLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPreviewTiyin(row.demoAmountTiyin)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge statusCode={row.statusCode} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableScrollRegion>
      </CardContent>
    </Card>
  )
}
