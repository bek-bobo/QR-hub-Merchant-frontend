import { describe, expect, it } from 'vitest'
import { createLocaleRuntime } from '@/shared/i18n/runtime'
import { createMessages } from '@/shared/i18n/messages'
import { createDynamicQrColumns } from '@/features/dynamic-qr/columns'
import { createDynamicQrPresentation } from '@/features/dynamic-qr/presentation'
import { decodeDynamicQrPageResponse } from '@/features/dynamic-qr/contract'
import { createDashboardRecentQrColumns } from '@/features/dashboard/recent-qr-columns'
import { createDashboardPresentation } from '@/features/dashboard/presentation'
import { createP5Columns } from '@/features/p5/columns'
import { createP5Presentation } from '@/features/p5/presentation'
import { decodeP5Page } from '@/shared/contracts/p5-read'
import { isoLocalDateTime } from '@/shared/contracts/merchant-read'
import { toDynamicQrQuery } from '@/features/dynamic-qr/filters'
import { formatDateRangeEndpoint } from './calendar'

describe.each(['uz', 'ru', 'en'] as const)('approved table date-time policy: %s', locale => {
  it('renders every production timestamp column with original sort/filter carriers preserved', async () => {
    const runtime = createLocaleRuntime(); await runtime.initialize(locale)
    const common = createMessages(runtime, 'common')
    const dynamic = createDynamicQrColumns(createDynamicQrPresentation(locale, createMessages(runtime, 'dynamicQr'), common))
    const recent = createDashboardRecentQrColumns(createDashboardPresentation(locale, createMessages(runtime, 'dashboard')))
    const p5 = createP5Columns(createP5Presentation(locale, createMessages(runtime, 'p5'), common))
    for (const [carrier, expected] of [
      ['2026-10-15T09:48:00', '15.10.2026 09:48'],
      ['2026-01-02T03:04', '02.01.2026 03:04'],
      ['2026-12-31T23:59:59.123456', '31.12.2026 23:59'],
    ]) {
      const page = decodeDynamicQrPageResponse({ success: true, data: { page: 0, size: 20, totalElements: 1, totalPages: 1,
        content: [{ pkey: 'unchanged-id', createdAt: carrier, updatedAt: carrier, terminalName: 'raw 10/15/2026 text', merchantName: 'Raw merchant', amount: 100000, statusCode: 0, rrn: null }] } })
      const row = page.content[0]!, before = JSON.stringify(page)
      for (const columns of [dynamic, recent]) expect(columns.find(column => column.id === 'createdAt')!.renderCell(row)).toBe(expected)
      const devices = decodeP5Page({ success: true, data: { page: 0, size: 20, totalElements: 1, totalPages: 1,
        content: [{ deviceId: 'fixture-device', description: 'raw 10/15/2026 text', deviceStatus: 0, terminalId: 'T', terminalName: 'Terminal', terminalType: 'WEB', merchantName: 'Merchant', staticQrId: null, staticQrLink: null, staticQrStatus: null, createdAt: carrier }] } })
      const device = devices.content[0]!, deviceBefore = JSON.stringify(devices)
      expect(p5.find(column => column.id === 'createdAt')!.renderCell(device)).toBe(expected)
      expect(row.createdAt).toBe(carrier); expect(device.createdAt).toBe(carrier)
      expect(JSON.stringify(page)).toBe(before); expect(JSON.stringify(devices)).toBe(deviceBefore)
      expect(row.terminalName).toBe('raw 10/15/2026 text')
    }
    const filters = { fromDate: '2026-10-01', toDate: '2026-10-15', search: 'raw 10/15/2026 text', page: 3, size: 100 as const }
    expect(toDynamicQrQuery(filters)).toEqual({ fromDate: filters.fromDate, toDate: filters.toDate, search: filters.search, page: '3', size: '100' })
    expect(formatDateRangeEndpoint(filters.fromDate)).toBe('01.10.2026')
    // These wire types are not offsetless timestamps and must not be reinterpreted.
    for (const carrier of ['2026-10-15T09:48:00Z', '2026-10-15T09:48:00+05:00']) expect(() => isoLocalDateTime(carrier)).toThrow()
  })
})
