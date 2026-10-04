import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReadRuntime } from '@/app/read/useReadRuntime'
import { Button } from '@/components/ui/button'
import { DateRangeQuickFilter } from '@/features/dynamic-qr/DateRangeQuickFilter'
import type { DashboardFilters, DashboardView, DateRange } from '@/shared/contracts/merchant-read'
import { isValidDateRange } from '@/shared/filters/date-range'
import { createDashboardQueryOptions } from './queries'
import { TrendChart } from './TrendChart'
import { chartGlobalContextKey, chartPresetRange, chartRangeDiffers, chartRequestFilters, type ChartRangeMode } from './chart-range'

interface ChartLocalDateFilterProps {
  readonly view: DashboardView
  readonly filters: DashboardFilters
  readonly initialInstant?: Date
}

// A global context change replaces only this chart controller, before any local fetch.
export function ChartLocalDateFilter(props: ChartLocalDateFilterProps) {
  return <ChartRangeController key={chartGlobalContextKey(props.filters)} {...props} />
}

export function ChartRangeController({ view, filters, initialInstant }: ChartLocalDateFilterProps) {
  const runtime = useReadRuntime()
  const [mode, setMode] = useState<ChartRangeMode>('dashboard')
  const [range, setRange] = useState<DateRange>(filters)
  const [draft, setDraft] = useState<DateRange>(filters)
  const [validation, setValidation] = useState<string | null>(null)
  const request = chartRequestFilters(filters, mode === 'dashboard' ? filters : range)
  const independent = mode !== 'dashboard' && chartRangeDiffers(filters, request)
  const options = createDashboardQueryOptions(runtime.queries, request)
  const query = useQuery({ ...options, enabled: independent && options.enabled })
  const data = independent ? query.data : view

  function reset() {
    setMode('dashboard')
    setRange(filters)
    setDraft(filters)
    setValidation(null)
  }

  function applyCustom(next: DateRange) {
    setDraft(next)
    if (!isValidDateRange(next)) {
      setValidation('To‘liq va to‘g‘ri sana oralig‘ini tanlang.')
      return
    }
    setRange(next)
    setMode('custom')
    setValidation(null)
  }

  const controls = <div className="min-w-0 max-w-full space-y-1">
    <div className="flex min-w-0 flex-wrap items-center gap-1" role="group" aria-label="Grafik sana filtri">
      <Button type="button" variant="outline" size="sm" aria-pressed={mode === 'dashboard'} onClick={reset}>Dashboard davri</Button>
      {(['7d', '30d', '1y'] as const).map((preset) => (
        <Button key={preset} type="button" variant="outline" size="sm" aria-pressed={mode === preset}
          onClick={() => {
            const next = chartPresetRange(preset, initialInstant ?? new Date())
            setRange(next); setDraft(next); setMode(preset); setValidation(null)
          }}>
          {preset === '7d' ? '7 kun' : preset === '30d' ? '30 kun' : '1 yil'}
        </Button>
      ))}
      <div className="min-w-0 max-w-full">
        <DateRangeQuickFilter triggerLabel={mode === 'custom' ? 'Davr… (tanlangan)' : 'Davr…'}
          resetLabel="Dashboard davri"
          value={draft} onDraftChange={setDraft} onApply={applyCustom} onReset={reset} />
      </div>
    </div>
    {validation ? <p role="alert" className="text-xs text-destructive">{validation}</p> : null}
  </div>

  const feedback = independent ? <>
    {query.isFetching || (query.isPending && !data) ? <p role="status" className="text-xs text-text-secondary">Grafik {data ? 'yangilanmoqda' : 'yuklanmoqda'}…</p> : null}
    {query.isError && !query.isFetching ? <div role="alert" className="space-y-2 text-sm text-destructive">
      <p>{data ? 'Grafik yangilanmadi. Avval yuklangan ma’lumotlar ko‘rsatilmoqda.' : 'Grafikni yuklab bo‘lmadi.'}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>Qayta urinish</Button>
    </div> : null}
  </> : null

  return <TrendChart view={data ?? view} rangeControls={controls}
    periodLabel={<p className="mt-1 text-xs text-text-secondary">Grafik davri: {request.fromDate} → {request.toDate}</p>}
    feedback={feedback} plotUnavailable={!data} />
}
