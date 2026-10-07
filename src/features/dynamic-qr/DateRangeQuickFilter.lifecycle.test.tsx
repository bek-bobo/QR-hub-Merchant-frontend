// @vitest-environment happy-dom
import { act, StrictMode, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { notifyManager, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { DynamicQrQuickFilters } from './DynamicQrQuickFilters'
import { createDefaultDynamicQrFilters } from './page-state'
import type { DateRange } from '@/shared/contracts/merchant-read'

let root: Root
let host: HTMLElement
const apply = vi.fn()
const reset = vi.fn()
const draft = vi.fn()
const requests = vi.fn()
let client: QueryClient
let replaceRange: (range: DateRange) => void
let wide = false
const layoutListeners = new Set<() => void>()
async function setWide(next: boolean) {
  await act(async () => { wide = next; layoutListeners.forEach(listener => listener()) })
}
function Calendar() {
  const [range, setRange] = useState<DateRange>(() => createDefaultDynamicQrFilters())
  const [applied, setApplied] = useState<DateRange>(() => createDefaultDynamicQrFilters())
  useEffect(() => { replaceRange = setRange }, [setRange])
  useQuery({ queryKey: ['calendar-dates', applied], queryFn: async () => { requests(applied); return null } })
  return <DynamicQrQuickFilters range={range} searchDraft="" onSearchDraftChange={() => undefined}
    onRangeDraftChange={(next) => { draft(next); setRange(next) }}
    onRangeApply={(next) => { apply(next); setApplied(next) }} onRangeReset={() => {
      const { fromDate, toDate } = createDefaultDynamicQrFilters()
      const next = { fromDate, toDate }
      reset(next); setRange(next); setApplied(next)
    }} />
}
beforeEach(async () => {
  wide = false; layoutListeners.clear()
  vi.stubGlobal('matchMedia', () => ({ matches: wide,
    addEventListener: (_: string, listener: () => void) => layoutListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => layoutListeners.delete(listener),
  }))
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-07T18:59:00Z'))
  vi.clearAllMocks(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  notifyManager.setScheduler(queueMicrotask)
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => root.render(<StrictMode><QueryClientProvider client={client}><Calendar /></QueryClientProvider></StrictMode>))
})
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); client.clear(); vi.useRealTimers()
  notifyManager.setScheduler((callback) => setTimeout(callback, 0))
  vi.unstubAllGlobals()
})
async function clickLabel(label: string) {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((node) => node.getAttribute('aria-label') === label)
  expect(button, label).toBeDefined()
  await act(async () => button!.click())
  await act(async () => vi.advanceTimersByTimeAsync(0))
}
async function day(date: string) {
  await clickLabel(new Intl.DateTimeFormat('uz-UZ', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00Z`)))
}
function cell(date: string) {
  const result = document.querySelector<HTMLButtonElement>(`button[data-calendar-date="${date}"]`)
  expect(result, date).not.toBeNull()
  return result!
}
async function hover(date: string, pointerType = 'mouse') {
  await act(async () => cell(date).dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType })))
}
function previewDates() {
  return [...new Set(Array.from(document.querySelectorAll('[data-preview]')).map((node) => node.getAttribute('data-calendar-date')))].sort()
}

describe('Dynamic QR real calendar interactions', () => {
  function panelCell(month: string, date: string) {
    return document.querySelector<HTMLButtonElement>(`section[aria-label="${month}"] button[data-calendar-date="${date}"]`)!
  }
  it('deduplicates desktop endpoints and fill, restoring adjacent styling when resized to mobile', async () => {
    await setWide(true)
    await act(async () => replaceRange({ fromDate: '2026-09-15', toDate: '2026-10-07' }))
    await clickLabel('Sana oralig‘ini tanlash')
    expect(document.querySelectorAll('button.bg-primary')).toHaveLength(2)
    expect(panelCell('Sen 2026', '2026-10-07').getAttribute('aria-pressed')).toBe('false')
    expect(panelCell('Okt 2026', '2026-10-07').getAttribute('aria-pressed')).toBe('true')
    expect(panelCell('Sen 2026', '2026-10-01').className).not.toContain('bg-brand-soft')
    expect(panelCell('Okt 2026', '2026-10-01').className).toContain('bg-brand-soft')
    expect(panelCell('Okt 2026', '2026-09-30').className).not.toContain('bg-brand-soft')
    await setWide(false)
    expect(panelCell('Sen 2026', '2026-10-07').getAttribute('aria-pressed')).toBe('true')
    expect(panelCell('Sen 2026', '2026-10-01').className).toContain('bg-brand-soft')
    await day('2026-10-07'); await hover('2026-10-06')
    expect(panelCell('Sen 2026', '2026-10-06').dataset.preview).toBe('start')
    await day('2026-10-06')
    expect(apply).toHaveBeenCalledExactlyOnceWith({ fromDate: '2026-10-06', toDate: '2026-10-07' })
  })
  it('deduplicates desktop provisional endpoints and fill without committing hover', async () => {
    await setWide(true)
    await act(async () => replaceRange({ fromDate: '2026-09-15', toDate: '2026-10-07' }))
    await clickLabel('Sana oralig‘ini tanlash'); await day('2026-09-15'); await hover('2026-10-07')
    expect(panelCell('Sen 2026', '2026-10-07').dataset.preview).toBeUndefined()
    expect(panelCell('Sen 2026', '2026-10-01').className).not.toContain('bg-brand-soft')
    expect(panelCell('Okt 2026', '2026-10-07').dataset.preview).toBe('end')
    expect(panelCell('Okt 2026', '2026-10-01').className).toContain('bg-brand-soft')
    expect(document.querySelectorAll('button.bg-primary')).toHaveLength(1)
    expect(apply).not.toHaveBeenCalled(); expect(requests).toHaveBeenCalledTimes(1)
  })
  it('renders one desktop same-day endpoint and only the canonical today marker', async () => {
    await setWide(true)
    await act(async () => replaceRange({ fromDate: '2026-09-15', toDate: '2026-09-15' }))
    await clickLabel('Sana oralig‘ini tanlash')
    expect(panelCell('Sen 2026', '2026-10-07').getAttribute('aria-current')).toBeNull()
    expect(panelCell('Sen 2026', '2026-10-07').className).not.toContain('ring-brand/40')
    expect(panelCell('Okt 2026', '2026-10-07').className).toContain('ring-brand/40')
    await act(async () => replaceRange({ fromDate: '2026-10-07', toDate: '2026-10-07' }))
    expect(document.querySelectorAll('button.bg-primary')).toHaveLength(1)
    expect(panelCell('Okt 2026', '2026-10-07').className).not.toContain('ring-brand/40')
  })
  it('renders deterministic October/November headers with unchanged Monday-first weekdays', async () => {
    await clickLabel('Sana oralig‘ini tanlash')
    expect(Array.from(document.querySelectorAll('h3')).map((node) => node.textContent)).toEqual(['Okt 2026', 'Noy 2026'])
    expect(Array.from(document.querySelector('section[aria-label="Okt 2026"]')!.querySelectorAll('.grid > span')).map((node) => node.textContent)).toEqual(['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'])
    expect(document.body.textContent).not.toMatch(/M10|M11/)
    expect(document.body.textContent).not.toContain('Sana oralig‘ini tanlang')
  })
  it.each([
    ['2026-10-10', '2026-10-15', 'start', 'end'],
    ['2026-10-15', '2026-10-10', 'end', 'start'],
    ['2026-10-15', '2026-10-15', 'same-day', 'same-day'],
  ])('previews first %s / hover %s without draft or request changes in StrictMode', async (first, hovered, firstState, hoverState) => {
    await clickLabel('Sana oralig‘ini tanlash'); await day(first)
    const calls = draft.mock.calls.length
    expect(requests).toHaveBeenCalledTimes(1)
    await hover(hovered)
    expect(cell(first).dataset.preview).toBe(firstState)
    expect(cell(hovered).dataset.preview).toBe(hoverState)
    expect(cell(first).getAttribute('aria-pressed')).toBe('true')
    if (first !== hovered) expect(cell(hovered).getAttribute('aria-pressed')).toBe('false')
    expect(previewDates()).toHaveLength(first === hovered ? 1 : 6)
    expect(draft).toHaveBeenCalledTimes(calls)
    expect(draft).toHaveBeenLastCalledWith({ fromDate: first, toDate: '' })
    expect(apply).not.toHaveBeenCalled(); expect(requests).toHaveBeenCalledTimes(1)
    await day(hovered)
    expect(apply).toHaveBeenCalledExactlyOnceWith({ fromDate: first < hovered ? first : hovered, toDate: first > hovered ? first : hovered })
    expect(requests).toHaveBeenCalledTimes(2)
    await clickLabel('Sana oralig‘ini tanlash'); expect(previewDates()).toEqual([])
    await hover('2026-10-20'); expect(previewDates()).toEqual([])
  })
  it('previews adjacent-month cells without moving panels; pointer leave and navigation clear preview', async () => {
    await clickLabel('Sana oralig‘ini tanlash'); await day('2026-10-30'); await hover('2026-11-02')
    expect(previewDates()).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
    expect(Array.from(document.querySelectorAll('h3')).map((node) => node.textContent)).toEqual(['Okt 2026', 'Noy 2026'])
    await act(async () => cell('2026-11-02').dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' })))
    expect(previewDates()).toEqual([])
    await hover('2026-11-02'); await clickLabel('Keyingi oy'); expect(previewDates()).toEqual([])
    expect(apply).not.toHaveBeenCalled(); expect(requests).toHaveBeenCalledTimes(1)
  })
  it('dismisses with draft intact and clears hover across reopen, Reset and external complete ranges', async () => {
    await clickLabel('Sana oralig‘ini tanlash'); await day('2026-10-15'); await hover('2026-10-20')
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(host.textContent).toContain('2026-10-15'); expect(host.textContent).toContain('…')
    expect(apply).not.toHaveBeenCalled(); expect(requests).toHaveBeenCalledTimes(1)
    await clickLabel('Sana oralig‘ini tanlash'); expect(previewDates()).toEqual([])
    await hover('2026-10-20')
    await act(async () => replaceRange({ fromDate: '2026-10-01', toDate: '2026-10-05' }))
    expect(previewDates()).toEqual([])
    await act(async () => replaceRange({ fromDate: '2026-10-15', toDate: '' }))
    expect(previewDates()).toEqual([])
    await hover('2026-10-20')
    await act(async () => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(node => node.textContent?.trim() === 'Bugungi kun')!.click())
    await clickLabel('Sana oralig‘ini tanlash'); expect(previewDates()).toEqual([])
    await day('2026-10-10'); expect(previewDates()).toEqual([])
  })
  it('marks Tashkent today independently of selection and prioritizes selected/range styling', async () => {
    vi.setSystemTime(new Date('2026-10-07T19:30:00Z'))
    await clickLabel('Sana oralig‘ini tanlash')
    expect(cell('2026-10-08').getAttribute('aria-current')).toBe('date')
    expect(cell('2026-10-08').getAttribute('aria-pressed')).toBe('false')
    expect(cell('2026-10-08').className).toContain('ring-brand/40')
    expect(cell('2026-10-07').getAttribute('aria-current')).toBeNull()
    await day('2026-10-08')
    expect(cell('2026-10-08').className).toContain('bg-primary')
    expect(cell('2026-10-08').className).not.toContain('ring-brand/40')
    await act(async () => replaceRange({ fromDate: '2026-10-05', toDate: '' }))
    await hover('2026-10-10')
    expect(cell('2026-10-08').className).toContain('bg-brand-soft')
    expect(cell('2026-10-08').className).not.toContain('ring-brand/40')
  })
  it('ignores touch hover while taps still complete a range without stuck preview', async () => {
    await clickLabel('Sana oralig‘ini tanlash'); await hover('2026-10-10', 'touch'); await day('2026-10-10')
    await hover('2026-10-15', 'touch'); expect(previewDates()).toEqual([])
    await day('2026-10-15')
    expect(apply).toHaveBeenCalledExactlyOnceWith({ fromDate: '2026-10-10', toDate: '2026-10-15' })
    expect(requests).toHaveBeenCalledTimes(2)
  })
  it.each([
    ['2026-10-10', '2026-10-10', '2026-10-10', '2026-10-10'],
    ['2026-10-20', '2026-10-08', '2026-10-08', '2026-10-20'],
  ])('first click stays draft; second completes %s then %s once in StrictMode', async (first, second, fromDate, toDate) => {
    await clickLabel('Sana oralig‘ini tanlash')
    await day(first)
    expect(draft).toHaveBeenLastCalledWith({ fromDate: first, toDate: '' })
    expect(apply).not.toHaveBeenCalled()
    expect(document.querySelector('[data-radix-popper-content-wrapper]')).not.toBeNull()
    await day(second)
    expect(apply).toHaveBeenCalledExactlyOnceWith({ fromDate, toDate })
    expect(document.querySelector('[data-radix-popper-content-wrapper]')).toBeNull()
  })

  it('dismisses an unfinished draft without applying, retains it on reopen, and navigates months', async () => {
    await clickLabel('Sana oralig‘ini tanlash'); await day('2026-10-20')
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(apply).not.toHaveBeenCalled()
    expect(host.textContent).toContain('2026-10-20')
    expect(host.textContent).toContain('…')
    await clickLabel('Sana oralig‘ini tanlash')
    await clickLabel('Keyingi oy'); await day('2026-11-02')
    expect(apply).toHaveBeenCalledExactlyOnceWith({ fromDate: '2026-10-20', toDate: '2026-11-02' })
  })

  it('exposes the today Reset caption and delegates one fresh reset after midnight', async () => {
    await clickLabel('Sana oralig‘ini tanlash')
    vi.setSystemTime(new Date('2026-10-07T19:30:00Z'))
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((node) => node.textContent?.trim() === 'Bugungi kun')
    expect(button).toBeDefined()
    expect(document.body.textContent).not.toContain('Standart 7 kunlik oraliq')
    await act(async () => button!.click())
    expect(reset).toHaveBeenCalledExactlyOnceWith({ fromDate: '2026-10-08', toDate: '2026-10-08' })
    expect(apply).not.toHaveBeenCalled()
    expect(document.querySelector('[data-radix-popper-content-wrapper]')).toBeNull()
    expect(host.textContent).toContain('2026-10-08')
  })
})
