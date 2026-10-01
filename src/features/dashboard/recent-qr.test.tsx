import { renderToStaticMarkup } from 'react-dom/server'
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DynamicQrActionsMenu } from '@/features/dynamic-qr/DynamicQrActionsMenu'
import { decodeDynamicQrPageResponse } from '@/features/dynamic-qr/contract'
import { DynamicQrDetailsContent } from '@/features/dynamic-qr/DynamicQrDetailsSheet'
import { QrDisplayDialog } from '@/features/dynamic-qr/QrDisplayDialog'
import { QrPresentation } from '@/features/dynamic-qr/QrPresentation'
import { copyExactPresentedLink, presentDynamicQrRowLink } from '@/features/dynamic-qr/qr-presentation'
import { TABLE_COLUMN_STORAGE_KEY } from '@/shared/table-columns/storage'
import { createTableColumnPreferenceRuntime } from '@/shared/table-columns/useTableColumnPreferences'
import { TableColumnPreferenceList } from '@/shared/ui/TableColumnPreferences'
import { RecentQrPanel } from './DashboardReadPage'
import { dashboardRecentQrColumns, DASHBOARD_RECENT_QR_TABLE_KEY } from './recent-qr-columns'
import { DashboardRecentQrTable } from './DashboardRecentQrTable'

const dto = {
  pkey: 'dashboard-qr-exact', terminalName: 'Terminal A', merchantName: 'Merchant A',
  terminalType: 'WEB', terminalId: 'terminal-1', merchantId: 12,
  bankAccountId: 34, bankAccountName: 'Account A', amount: 500000,
  currencyAmount: 41.25, currencyCode: 'USD', rate: 12150.5, serviceFeeAmount: 125,
  statusCode: 50, distributionStatus: 777, rrn: 'RRN-1',
  createdAt: '2026-09-30T11:26:00', updatedAt: '2026-09-30T11:30:00',
  link: 'https://qrhub.uz/Exact/%2fPath?case=MiXeD',
}

function decode(overrides: Record<string, unknown> = {}) {
  return decodeDynamicQrPageResponse({ success: true, data: {
    content: [{ ...dto, ...overrides }], totalElements: 1, totalPages: 1, page: 0, size: 10,
  } }).content[0]!
}

type RecentQrSuccessQuery = Extract<
  ComponentProps<typeof RecentQrPanel>['query'],
  { status: 'success'; isPlaceholderData: false }
>

function successfulRecentQrQuery(data: RecentQrSuccessQuery['data']): RecentQrSuccessQuery {
  const result: RecentQrSuccessQuery = {
    data,
    dataUpdatedAt: 1,
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isLoading: false,
    isPending: false,
    isLoadingError: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    isEnabled: true,
    refetch: async () => result,
    status: 'success',
    fetchStatus: 'idle',
  }
  return result
}

function runtime() {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
  const mount = () => createTableColumnPreferenceRuntime({
    tableKey: DASHBOARD_RECENT_QR_TABLE_KEY, columns: dashboardRecentQrColumns, storage,
  })
  return { values, mount, preferences: mount() }
}

function table(preferences: ReturnType<typeof runtime>['preferences']) {
  const snapshot = preferences.getSnapshot()
  return renderToStaticMarkup(<DashboardRecentQrTable rows={[decode()]}
    columnOrder={snapshot.order} visibleColumnIds={snapshot.visible}
    onViewQr={() => undefined} onViewDetails={() => undefined} />)
}

function headers(html: string) {
  return Array.from(html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g), (match) => match[1])
}

function findElement(node: ReactNode, predicate: (element: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue
    if (predicate(child)) return child
    const nested = findElement(child.props.children as ReactNode, predicate)
    if (nested) return nested
  }
  return undefined
}

describe('Dashboard recent QR preferences and actions', () => {
  it('adds the compact settings trigger beside the unchanged navigation', () => {
    const query = successfulRecentQrQuery({
      content: [decode()], totalElements: 1, totalPages: 1, page: 0, size: 10,
    })
    const html = renderToStaticMarkup(<MemoryRouter><RecentQrPanel query={query} enabled
      filters={{ fromDate: '2026-09-30', toDate: '2026-10-01' }} dynamicQrPath="/dynamic-qrs" /></MemoryRouter>)
    expect(html).toContain('aria-label="Jadval ustunlarini sozlash"')
    expect(html).toContain('>Ustunlar</span>')
    expect(html).toContain('href="/dynamic-qrs"')
    expect(html).toContain('Barchasini ko‘rish')
  })

  it('routes both menu actions to the exact loaded row', () => {
    const row = decode()
    let qrRow: unknown
    let detailsRow: unknown
    const menu = DynamicQrActionsMenu({ row,
      onViewQr: (selected) => { qrRow = selected }, onViewDetails: (selected) => { detailsRow = selected },
    })
    for (const label of ['QR ko‘rish', 'Qo‘shimcha ma’lumotlar']) {
      const item = findElement(menu, (element) => typeof element.props.onSelect === 'function'
        && Children.toArray(element.props.children as ReactNode).includes(label))
      expect(item).toBeDefined()
      ;(item!.props.onSelect as () => void)()
    }
    expect(qrRow).toBe(row)
    expect(detailsRow).toBe(row)
  })

  it('connects real desktop drop handlers to Dashboard order without altering visibility', () => {
    const { preferences } = runtime()
    preferences.toggleVisibility('terminal')
    const hidden = preferences.getSnapshot().hidden
    const list = TableColumnPreferenceList({ items: dashboardRecentQrColumns,
      order: preferences.getSnapshot().order, hidden, draggedColumnId: 'status', dropTargetId: 'createdAt',
      onMoveUp: preferences.moveUp, onMoveDown: preferences.moveDown, onMove: preferences.move,
      onToggleVisibility: preferences.toggleVisibility, canHide: preferences.canHide,
      onDragStart: () => undefined, onDragTarget: () => undefined, onDragEnd: () => undefined,
    })
    const target = findElement(list, (element) => element.props['data-column-id'] === 'createdAt')
    expect(target).toBeDefined()
    ;(target!.props.onDrop as (event: { preventDefault: () => void }) => void)({ preventDefault: () => undefined })
    expect(preferences.getSnapshot().hidden).toEqual(hidden)
    expect(headers(table(preferences))).toEqual(['QR ID', 'Status', 'Vaqt', 'Summa', 'Amallar'])
    expect(renderToStaticMarkup(list)).toContain('draggable="true"')
    expect(renderToStaticMarkup(list)).not.toContain('data-column-id="actions"')
  })

  it('defines only five customizable business columns in the compact default order', () => {
    expect(DASHBOARD_RECENT_QR_TABLE_KEY).toBe('dashboardRecentQr')
    expect(dashboardRecentQrColumns.map(({ id }) => id)).toEqual(['qrId', 'createdAt', 'terminal', 'amount', 'status'])
    expect(dashboardRecentQrColumns.every((column) => column.defaultVisible && column.hideable && column.reorderable)).toBe(true)
    expect(headers(table(runtime().preferences))).toEqual(['QR ID', 'Vaqt', 'Terminal', 'Summa', 'Status', 'Amallar'])
  })

  it('hides headers and cells, restores saved position, and keeps actions final', () => {
    const { preferences } = runtime()
    preferences.move('terminal', 'qrId')
    const order = preferences.getSnapshot().order
    preferences.toggleVisibility('terminal')
    expect(preferences.getSnapshot().order).toEqual(order)
    expect(headers(table(preferences))).toEqual(['QR ID', 'Vaqt', 'Summa', 'Status', 'Amallar'])
    expect(table(preferences)).not.toContain('Terminal A')
    preferences.toggleVisibility('terminal')
    expect(headers(table(preferences))[0]).toBe('Terminal')
    expect(table(preferences)).toContain('aria-label="Amallarni ochish"')
  })

  it('persists reorder and visibility in v2 and restores them on remount', () => {
    const { preferences, values, mount } = runtime()
    preferences.toggleVisibility('terminal')
    const hidden = preferences.getSnapshot().hidden
    preferences.move('status', 'createdAt')
    expect(preferences.getSnapshot().hidden).toEqual(hidden)
    expect(headers(table(preferences))).toEqual(['QR ID', 'Status', 'Vaqt', 'Summa', 'Amallar'])
    expect(TABLE_COLUMN_STORAGE_KEY).toBe('qrhub:table-columns:v2')
    expect([...values.keys()]).toEqual([TABLE_COLUMN_STORAGE_KEY])
    expect(values.get(TABLE_COLUMN_STORAGE_KEY)).toContain('dashboardRecentQr')
    expect(values.get(TABLE_COLUMN_STORAGE_KEY)).not.toContain('Amallar')
    expect(mount().getSnapshot()).toEqual(preferences.getSnapshot())
  })

  it('protects the final business column and resets only its preferences', () => {
    const { preferences } = runtime()
    for (const id of ['qrId', 'createdAt', 'terminal', 'amount']) preferences.toggleVisibility(id)
    expect(preferences.canHide('status')).toBe(false)
    preferences.toggleVisibility('status')
    expect(headers(table(preferences))).toEqual(['Status', 'Amallar'])
    preferences.move('status', 'qrId')
    preferences.reset()
    expect(preferences.getSnapshot().hidden).toEqual([])
    expect(headers(table(preferences))).toEqual(['QR ID', 'Vaqt', 'Terminal', 'Summa', 'Status', 'Amallar'])
  })

  it('reuses loaded source-confirmed details without mutating the DTO', () => {
    const before = JSON.stringify(dto)
    const html = renderToStaticMarkup(<DynamicQrDetailsContent row={decode()} onViewQr={() => undefined} />)
    for (const value of ['dashboard-qr-exact', 'Terminal A', 'terminal-1', 'WEB', 'Merchant A', '12',
      'Account A', '34', '5 000.00 UZS', '41.25', 'USD', '12150.5', '125', '777', 'RRN-1',
      '30.09.2026 11:26', '30.09.2026 11:30', 'QR ko‘rish', 'Havolani nusxalash']) expect(html).toContain(value)
    expect(JSON.stringify(dto)).toBe(before)
  })

  it.each([null, 'http://qrhub.uz/unsafe', 'javascript:alert(1)'])('safely handles nullable details and unavailable link %s', async (link) => {
    const row = decode({ link, terminalId: null, terminalType: null, updatedAt: null,
      merchantId: null, bankAccountId: null, bankAccountName: null, currencyAmount: null,
      currencyCode: null, rate: null, serviceFeeAmount: null, distributionStatus: null, rrn: null })
    const html = renderToStaticMarkup(<DynamicQrDetailsContent row={row} onViewQr={() => undefined} />)
    expect(html).toContain('—')
    expect(html).not.toMatch(/>null<|>undefined<|>NaN<|Havolani nusxalash|>QR ko‘rish</)
    expect(presentDynamicQrRowLink(row).kind).toBe('unavailable')
    let copied = false
    expect(await copyExactPresentedLink(presentDynamicQrRowLink(row), async () => { copied = true })).toBe('unavailable')
    expect(copied).toBe(false)
  })

  it('copies the exact backend link without deriving anything from the QR ID', async () => {
    const row = decode()
    const link = presentDynamicQrRowLink(row)
    expect(link).toMatchObject({ kind: 'available', original: dto.link })
    let copied = ''
    await copyExactPresentedLink(link, async (value) => { copied = value })
    expect(copied).toBe(dto.link)
    expect(presentDynamicQrRowLink({ ...row, link: null }).kind).toBe('unavailable')
  })

  it.each([dto.link, null, 'javascript:alert(1)'])('passes the Dashboard row through the shared QR safety presentation: %s', (link) => {
    const dialog = QrDisplayDialog({ row: decode({ link }), onOpenChange: () => undefined })
    const presentation = findElement(dialog, (element) => element.type === QrPresentation)
    expect(presentation).toBeDefined()
    if (link === dto.link) {
      expect(presentation!.props.link).toEqual({ kind: 'available', original: dto.link })
      expect(presentation!.props.onCopy).toBeTypeOf('function')
    } else {
      expect(presentation!.props.link).toEqual({ kind: 'unavailable' })
      expect(presentation!.props.onCopy).toBeUndefined()
    }
  })
})
