import { useState } from 'react'
import { Link } from 'react-router'
import { useAccessContext } from '@/shared/auth/useAccessContext'
import { can } from '@/shared/auth/access'
import { RefreshCwIcon } from 'lucide-react'
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
import type {
  DynamicQrFilters,
} from '@/shared/contracts/merchant-read'
import {
  EmptyState,
  ErrorState,
  NoAccessState,
} from '@/shared/ui/AsyncState'
import { FilterDrawer } from '@/shared/ui/FilterDrawer'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { PageHeader } from '@/shared/ui/PageHeader'
import { applyQrFilters, type DynamicQrFilterDraft } from './filters'
import { DynamicQrTable } from './DynamicQrTable'
import { ExportButton } from './ExportButton'
import {
  changeDynamicQrPage,
  createDefaultDynamicQrFilters,
  parseDashboardDynamicQrState,
  parseQrStatusInput,
} from './page-state'
import { useDynamicQrReadQueries } from './queries'
import { formatInstantTime } from '@/shared/presentation/date-time'

const statusOptions = [
  { value: '', label: 'Barchasi' },
  { value: '0', label: 'Yangi' },
  { value: '10', label: 'Jarayonda' },
  { value: '50', label: 'Muvaffaqiyatli' },
  { value: '5', label: 'Muddati o‘tgan' },
  { value: '20', label: 'Bekor qilingan' },
] as const

interface DynamicQrPageProps {
  readonly initialState?: unknown
  readonly initialInstant?: Date
}

function initialFiltersFromState(
  initialState: unknown,
  instant = new Date(),
): DynamicQrFilters {
  const defaults = createDefaultDynamicQrFilters(instant)
  const dashboardState = parseDashboardDynamicQrState(initialState)
  return dashboardState
    ? Object.freeze({ ...defaults, ...dashboardState })
    : defaults
}

function ListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Dinamik QR ro‘yxati yuklanmoqda"
      className="space-y-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

export function DynamicQrPage({
  initialState,
  initialInstant,
}: DynamicQrPageProps) {
  const access = useAccessContext()
  const [initialFilters] = useState(() =>
    initialFiltersFromState(initialState, initialInstant ?? new Date()),
  )
  const [draft, setDraft] = useState<DynamicQrFilterDraft>(initialFilters)
  const [applied, setApplied] = useState<DynamicQrFilters>(initialFilters)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const queries = useDynamicQrReadQueries(applied)
  const { runtime, terminals, list, terminalFilterState, enabled } = queries

  function applyFilters(): boolean {
    try {
      const next = applyQrFilters(draft)
      setDraft(next)
      setApplied(next)
      setValidationMessage(null)
      return true
    } catch {
      setValidationMessage('Sana oralig‘ini to‘g‘ri kiriting.')
      return false
    }
  }

  function clearFilters() {
    const next = createDefaultDynamicQrFilters(initialInstant ?? new Date())
    setDraft(next)
    setApplied(next)
    setValidationMessage(null)
  }

  function goToPage(page: number) {
    setApplied((current) => changeDynamicQrPage(current, page))
  }

  if (runtime.readiness.dynamicQr.kind === 'unavailable') {
    return (
      <ErrorState
        title="Dinamik QR integratsiyasi sozlanmagan"
        description={runtime.readiness.dynamicQr.reason}
      />
    )
  }

  if (!runtime.capabilities.dynamicQr) {
    return (
      <NoAccessState description="Dinamik QR ro‘yxatini ko‘rish huquqi mavjud emas." />
    )
  }

  const emptyHighPage = Boolean(
    list.data && list.data.page > 0 && list.data.content.length === 0,
  )

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Tranzaksiyalar"
        title="Dinamik QRlar"
        description={
          <>
            Filtrlash va sahifalash server tomonidan bajariladi.
            {can(access, 'dynamicQr.cancel', false) ? (
              <span role="status" className="mt-2 block">
                Bekor qilish hozircha mavjud emas.
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            {can(access, 'dynamicQr.create', false) ? (
              <Button asChild><Link to="/dynamic-qrs/new">Yangi QR yaratish</Link></Button>
            ) : null}
            <ExportButton applied={applied} terminalValid={terminalFilterState === 'valid'} />
            {list.dataUpdatedAt > 0 ? (
              <span className="text-xs text-text-secondary">
                Yangilangan: {formatInstantTime(list.dataUpdatedAt)}
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={!enabled.list || list.isFetching}
              onClick={() => void list.refetch()}
            >
              <RefreshCwIcon
                aria-hidden="true"
                className={list.isFetching ? 'animate-spin' : ''}
              />
              Yangilash
            </Button>
          </>
        }
      />

      <FilterDrawer
        description="O‘zgarishlar faqat “Qo‘llash” bosilganda so‘rovga qo‘shiladi."
        onApply={applyFilters}
        onReset={clearFilters}
      >
          <div className="grid gap-4">
            <label className="block space-y-1.5 text-sm font-medium text-text-primary">
              Boshlanish sanasi
              <Input
                type="date"
                value={draft.fromDate}
                aria-invalid={Boolean(validationMessage)}
                onChange={(event) =>
                  setDraft({ ...draft, fromDate: event.target.value })
                }
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-text-primary">
              Tugash sanasi
              <Input
                type="date"
                value={draft.toDate}
                aria-invalid={Boolean(validationMessage)}
                onChange={(event) =>
                  setDraft({ ...draft, toDate: event.target.value })
                }
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-text-primary">
              Terminal
              <Select
                value={draft.terminalId ?? ''}
                disabled={!enabled.terminals || terminals.isPending}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    terminalId: event.target.value || undefined,
                  })
                }
              >
                <option value="">Barcha terminallar</option>
                {terminals.data?.map((terminal) => (
                  <option key={terminal.id} value={terminal.id}>
                    {terminal.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-text-primary">
              Status
              <Select
                value={draft.status === undefined ? '' : String(draft.status)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    status: parseQrStatusInput(event.target.value),
                  })
                }
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium text-text-primary">
            Qidiruv
            <Input
              type="search"
              value={draft.search}
              placeholder="Terminal nomi bo‘yicha"
              onChange={(event) =>
                setDraft({ ...draft, search: event.target.value })
              }
            />
          </label>
          {validationMessage ? (
            <p role="alert" className="text-sm text-destructive">
              {validationMessage}
            </p>
          ) : null}
          {!enabled.terminals ? (
            <p className="text-sm text-text-secondary">
              {applied.terminalId
                ? 'Tanlangan terminalni tekshirib bo‘lmadi; filtrni tozalash talab qilinadi.'
                : 'Terminal filtri mavjud emas; ro‘yxat terminalId yubormasdan ishlaydi.'}
            </p>
          ) : terminals.isError ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-destructive">
              Terminal ro‘yxatini yuklab bo‘lmadi.
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void terminals.refetch()}
              >
                Qayta urinish
              </Button>
            </div>
          ) : null}
      </FilterDrawer>

      {terminalFilterState === 'checking' ? (
        <Card>
          <CardContent className="text-sm text-text-secondary">
            Tanlangan terminal filtri tekshirilmoqda.
          </CardContent>
        </Card>
      ) : terminalFilterState === 'invalid' ? (
        <Card>
          <CardHeader>
            <CardTitle>Terminal filtri endi mavjud emas</CardTitle>
            <CardDescription>
              Xavfsizlik sababli so‘rov barcha terminallarga avtomatik kengaytirilmadi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={clearFilters}>Filtrni tozalash</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="min-w-0" aria-busy={list.isFetching}>
          <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <div>
              <CardTitle>Dinamik QR ro‘yxati</CardTitle>
              <CardDescription>
                {list.data
                  ? `${list.data.totalElements.toLocaleString('uz-UZ')} ta server natijasi`
                  : 'Qo‘llangan filtrlar bo‘yicha'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            {list.isPending ? (
              <ListSkeleton />
            ) : list.isError && !list.data ? (
              <ErrorState onRetry={() => void list.refetch()} />
            ) : emptyHighPage ? (
              <EmptyState
                title="Bu sahifada ma’lumot qolmadi"
                description="Natijalar o‘zgargan bo‘lishi mumkin. Birinchi sahifaga qayting."
              />
            ) : list.data && list.data.content.length === 0 ? (
              <EmptyState description="Qo‘llangan filtrlar bo‘yicha ma’lumot topilmadi." />
            ) : list.data ? (
              <DynamicQrTable rows={list.data.content} />
            ) : null}

            {emptyHighPage ? (
              <Button type="button" onClick={() => goToPage(0)}>
                Birinchi sahifaga qaytish
              </Button>
            ) : null}
            {list.isRefetchError && list.data ? (
              <p role="alert" className="text-sm text-destructive">Yangilanmadi</p>
            ) : null}
            {list.data ? (
              <PaginationBar ariaLabel="Dinamik QR sahifalari"
                currentPage={list.data.page} totalPages={list.data.totalPages}
                totalItems={list.data.totalElements} onPageChange={goToPage} />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
