import type { AccessContextValue, Capability } from '@/shared/auth/access'
import type { CurrencyOption } from '@/shared/contracts/currency.contract'
import type { CreateTerminalOption } from '@/shared/contracts/terminal-lookup.contract'
import type { DynamicQrRow, Money, Page, ReadScope, TerminalOption } from '@/shared/contracts/merchant-read'
import type { StaticQrRow } from '@/features/static-qr/contract'
import type { CreateQrPort } from '@/features/dynamic-qr/create-qr'
import type { CancelQrPort } from '@/features/dynamic-qr/cancel-qr'
import { createExportDownloadIntent } from '@/features/dynamic-qr/export-download'
import type { XlsxDownload } from '@/shared/api/xlsx-download'
import { d4XlsxFixture } from './xlsx-fixture'

// D4-ACTIONS-DEMO-ONLY. These fixtures are reachable only from the DEV/demo dynamic import.
export const D4_FIXED_INSTANT = '2026-09-15T07:00:00Z'

export const actionScenarios = [
  'CREATE_CONFIRMED_SAFE_LINK', 'CREATE_CONFIRMED_LINK_BLOCKED',
  'CREATE_UNKNOWN', 'CREATE_PERMISSION_DENIED',
  'EXPORT_READY', 'EXPORT_SUCCESS', 'EXPORT_ERROR', 'EXPORT_STALE',
  'CANCEL_CONFIRMED', 'CANCEL_REJECTED', 'CANCEL_UNKNOWN', 'CANCEL_PERMISSION_LOST',
] as const
export type ActionScenario = (typeof actionScenarios)[number]

export const staticScenarios = [
  'STATIC_NORMAL', 'STATIC_EMPTY', 'STATIC_ERROR', 'STATIC_LOOKUP_DENIED',
  'STATIC_TERMINAL_LOST', 'STATIC_UNKNOWN_STATUS',
] as const
export type StaticScenario = (typeof staticScenarios)[number]

export const demoProfiles = {
  ALL_ALLOWED_FOR_SCENARIO: ['dynamicQr.create', 'dynamicQr.export', 'dynamicQr.cancel', 'staticQr.read', 'terminal.lookup'],
  CREATE_ONLY: ['dynamicQr.create'],
  EXPORT_ONLY: ['dynamicQr.export'],
  CANCEL_ONLY_FAKE: ['dynamicQr.cancel'],
  STATIC_ONLY: ['staticQr.read', 'terminal.lookup'],
  ALL_DENIED: [],
} as const satisfies Record<string, readonly Capability[]>
export type DemoProfile = keyof typeof demoProfiles

export function demoAccess(profile: DemoProfile): AccessContextValue {
  return { kind: 'demo', grants: new Set<Capability>(demoProfiles[profile]) }
}

export function profileForAction(scenario: ActionScenario): DemoProfile {
  if (scenario === 'CREATE_PERMISSION_DENIED') return 'ALL_DENIED'
  if (scenario.startsWith('CREATE_')) return 'CREATE_ONLY'
  if (scenario.startsWith('EXPORT_')) return 'EXPORT_ONLY'
  return 'CANCEL_ONLY_FAKE'
}

export const d4Scope: ReadScope = Object.freeze({
  source: 'demo', sessionScopeId: 'd4-demo-session', accessRevision: 1,
})
export const d4Terminal: CreateTerminalOption = Object.freeze({
  id: 'a'.repeat(32), name: 'D4 terminal', minAmountMinor: '100000', maxAmountMinor: '2000000000',
})
export const d4Currency: CurrencyOption = Object.freeze({
  code: 'UZS', nameUz: 'So‘m', nameRu: null, nameEn: null, status: null, label: 'So‘m',
})
export const d4CreateLink = 'https://example.test/D4-QR-DEMO-001?fixed=2026-09-15T07%3A00%3A00Z'

export function createDemoPort(scenario: ActionScenario, count: () => void): CreateQrPort | null {
  if (!scenario.startsWith('CREATE_') || scenario === 'CREATE_PERMISSION_DENIED') return null
  return { create: async () => {
    count()
    if (scenario === 'CREATE_UNKNOWN') throw new Error('Simulated lost response')
    return { success: true, data: { pkey: 'D4-QR-DEMO-CREATE-001', link: d4CreateLink } }
  } }
}

const d4CancelAmount: Money = Object.freeze({ minorUnits: '100000', currency: 'UZS', scale: 2 })

export const d4CancelRow: DynamicQrRow = Object.freeze({
  pkey: 'D4-QR-DEMO-CANCEL-001', createdAt: '2026-09-15T07:00:00',
  terminalName: 'D4 terminal', merchantName: 'D4 merchant', statusCode: 0, rrn: null,
  amount: d4CancelAmount,
})

export function createDemoCancelPort(scenario: ActionScenario, count: () => void,
  late?: Promise<void>): CancelQrPort | null {
  if (!scenario.startsWith('CANCEL_')) return null
  return { cancel: async () => {
    count()
    if (late) await late
    if (scenario === 'CANCEL_UNKNOWN') throw new Error('Simulated lost response')
    if (scenario === 'CANCEL_REJECTED') return { kind: 'business-rejection' }
    return { kind: 'response', ok: true, status: 200, body: { success: true, data: null } }
  } }
}

export const d4StaticTerminal: TerminalOption = Object.freeze({ id: 'D4-terminal-1', name: 'D4 terminal' })
export const d4StaticRows: readonly StaticQrRow[] = Object.freeze([
  Object.freeze({ id: 'D4-QR-DEMO-STATIC-001', terminalName: 'D4 terminal', merchantName: 'D4 merchant', statusCode: 0 }),
  Object.freeze({ id: 'D4-QR-DEMO-STATIC-002', terminalName: 'D4 terminal', merchantName: 'D4 merchant', statusCode: 777 }),
])

export function staticDemoPage(scenario: StaticScenario, page: number, size: 10 | 25 | 50): Page<StaticQrRow> {
  const rows = scenario === 'STATIC_EMPTY' ? [] : scenario === 'STATIC_UNKNOWN_STATUS'
    ? d4StaticRows.slice(1) : d4StaticRows
  return { content: rows.slice(page * size, (page + 1) * size), totalElements: rows.length,
    totalPages: Math.ceil(rows.length / size), page, size }
}

export const d4ExportQuery = Object.freeze({ fromDate: '2026-09-15', toDate: '2026-09-15' })

export function createDemoExportScenario(scenario: ActionScenario,
  handoff: (file: XlsxDownload) => () => void) {
  let currentScope = d4Scope
  let releaseLate: () => void = () => undefined
  const late = new Promise<void>((resolve) => { releaseLate = resolve })
  const intent = createExportDownloadIntent({
    getXlsx: async () => {
      if (scenario === 'EXPORT_ERROR') throw new Error('Simulated export failure')
      if (scenario === 'EXPORT_STALE') await late
      return d4XlsxFixture()
    },
    isCurrent: () => currentScope.source === d4Scope.source &&
      currentScope.sessionScopeId === d4Scope.sessionScopeId &&
      currentScope.accessRevision === d4Scope.accessRevision,
    handoff,
  })
  return {
    run: () => intent.run(d4ExportQuery),
    changeAccessRevision: () => {
      currentScope = { ...currentScope, accessRevision: currentScope.accessRevision + 1 }
      releaseLate()
    },
    invalidate: () => intent.invalidate(),
    getCurrentScope: () => currentScope,
  }
}
