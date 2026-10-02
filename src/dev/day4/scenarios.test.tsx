import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createCreateQrController } from '@/features/dynamic-qr/create-qr'
import { presentCreateResult, liveCreateLinkSchemes } from '@/features/dynamic-qr/create-result'
import { CreateQrResult } from '@/features/dynamic-qr/CreateQrResult'
import { createCancelQrController, productionCancelGate } from '@/features/dynamic-qr/cancel-qr'
import { StaticQrResults } from '@/features/static-qr/StaticQrResults'
import { STATIC_QR_DEFAULT_COLUMN_ORDER } from '@/features/static-qr/columns'
import { getStaticTerminalState } from '@/features/static-qr/page-state'
import { resolveSafeReturnTo } from '@/app/safe-return-to'
import { liveFeatureRouteDefinitions } from '@/app/live-route-policy'
import { resolveRuntimeMode } from '@/shared/config/runtime'
import { actionScenarios, createDemoCancelPort, createDemoExportScenario, createDemoPort,
  d4CancelRow, d4CreateLink, d4Currency, d4Scope, d4StaticRows, d4StaticTerminal,
  d4Terminal, demoAccess, demoProfiles, D4_FIXED_INSTANT, staticDemoPage, staticScenarios } from './scenarios'
import { d4XlsxFixture } from './xlsx-fixture'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => { resolve = yes })
  return { promise, resolve }
}

describe('DEV-only D4 scenario registry', () => {
  it('lists every required action and static scenario with a fixed clock', () => {
    expect(actionScenarios).toEqual([
      'CREATE_CONFIRMED_SAFE_LINK', 'CREATE_CONFIRMED_LINK_BLOCKED', 'CREATE_UNKNOWN', 'CREATE_PERMISSION_DENIED',
      'EXPORT_READY', 'EXPORT_SUCCESS', 'EXPORT_ERROR', 'EXPORT_STALE',
      'CANCEL_CONFIRMED', 'CANCEL_REJECTED', 'CANCEL_UNKNOWN', 'CANCEL_PERMISSION_LOST',
    ])
    expect(staticScenarios).toEqual(['STATIC_NORMAL', 'STATIC_EMPTY', 'STATIC_ERROR',
      'STATIC_LOOKUP_DENIED', 'STATIC_TERMINAL_LOST', 'STATIC_UNKNOWN_STATUS'])
    expect(D4_FIXED_INSTANT).toBe('2026-09-15T07:00:00Z')
    expect(d4CancelRow.createdAt).toBe('2026-09-15T07:00:00')
    expect(demoProfiles.STATIC_ONLY).toContain('staticQr.read')
    expect(demoAccess('ALL_DENIED')).toEqual({ kind: 'demo', grants: new Set() })
  })

  it('keeps all D4 fake paths outside live route and safe-return policies', () => {
    expect(Object.values(liveFeatureRouteDefinitions).map((item) => item.path))
      .not.toContain('/dev/day4/actions')
    expect(resolveSafeReturnTo('/dev/day4/actions')).toBe('/account')
    expect(resolveSafeReturnTo('/dev/day4/static-qrs')).toBe('/account')
    expect(resolveRuntimeMode('demo', false)).toBe('live')
    expect(liveCreateLinkSchemes).toEqual(['https:'])
    expect(productionCancelGate.port()).toBeNull()
    expect(productionCancelGate.eligibleRow(d4CancelRow)).toBe(false)
  })
})

describe('D4 create fake composition', () => {
  function create(scenario: 'CREATE_CONFIRMED_SAFE_LINK' | 'CREATE_CONFIRMED_LINK_BLOCKED' | 'CREATE_UNKNOWN' | 'CREATE_PERMISSION_DENIED') {
    let dispatches = 0
    const port = createDemoPort(scenario, () => { dispatches++ })
    const controller = createCreateQrController({ currentScope: () => d4Scope,
      canCreate: () => scenario !== 'CREATE_PERMISSION_DENIED', port: () => port })
    return { controller, dispatches: () => dispatches, submit: () => controller.submit({
      draft: { terminalId: d4Terminal.id, amountInput: '1000', currencyCode: 'UZS' },
      terminals: [d4Terminal], currencies: [d4Currency], terminalLookupAllowed: true,
      currencyLookupAllowed: true,
    }) }
  }

  it('confirms the exact fake link only under explicit test policy', async () => {
    const demo = create('CREATE_CONFIRMED_SAFE_LINK')
    expect((await demo.submit()).kind).toBe('confirmed')
    const safe = presentCreateResult(demo.controller.getState(), ['https:'])
    expect(safe?.kind).toBe('confirmed')
    if (safe?.kind !== 'confirmed') throw new Error('Missing confirmed result')
    expect(safe.link).toEqual({ kind: 'available', original: d4CreateLink })
    const html = renderToString(createElement(CreateQrResult, { result: safe,
      currentScope: () => d4Scope, canCreate: () => true, onClose: () => undefined,
      onNewIntent: () => undefined }))
    expect(html).toContain(d4CreateLink.replaceAll('&', '&amp;'))
    expect(html).toContain('Havolani nusxalash')
    expect(html).toContain('<svg')
    expect(demo.dispatches()).toBe(1)
  })

  it('keeps confirmed creation and allows the approved HTTPS link under the live policy', async () => {
    const demo = create('CREATE_CONFIRMED_SAFE_LINK')
    await demo.submit()
    const confirmed = presentCreateResult(demo.controller.getState())
    expect(confirmed?.kind).toBe('confirmed')
    if (confirmed?.kind !== 'confirmed') throw new Error('Missing confirmed result')
    expect(confirmed.link).toEqual({ kind: 'available', original: d4CreateLink })
    const html = renderToString(createElement(CreateQrResult, { result: confirmed,
      currentScope: () => d4Scope, canCreate: () => true, onClose: () => undefined,
      onNewIntent: () => undefined }))
    expect(html).toContain('<svg')
    expect(html).toContain(d4CreateLink.replaceAll('&', '&amp;'))
    expect(html).toContain('Havolani nusxalash')
    expect(demo.dispatches()).toBe(1)
  })

  it('keeps unknown and denied results free of confirmed data or dispatch', async () => {
    const unknown = create('CREATE_UNKNOWN')
    expect((await unknown.submit()).kind).toBe('unknown')
    expect(presentCreateResult(unknown.controller.getState())?.kind).toBe('unknown')
    expect((await unknown.submit()).kind).toBe('not-sent')
    expect(unknown.dispatches()).toBe(1)
    const denied = create('CREATE_PERMISSION_DENIED')
    expect((await denied.submit()).kind).toBe('not-sent')
    expect(denied.dispatches()).toBe(0)
  })
})

describe('D4 export fake boundary', () => {
  it('uses an in-memory workbook and one handoff only after explicit run', async () => {
    let handoffs = 0
    const demo = createDemoExportScenario('EXPORT_SUCCESS', (file) => {
      expect(file.filename).toBe('dynamic-qrs.xlsx')
      expect(file.blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      handoffs++
      return () => undefined
    })
    expect(handoffs).toBe(0)
    expect((await demo.run())).toBe('handed-off')
    expect(handoffs).toBe(1)
    const bytes = new Uint8Array(await d4XlsxFixture().blob.arrayBuffer())
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])
  })

  it('hands off neither error nor stale completion after revision change', async () => {
    let handoffs = 0
    const handoff = () => { handoffs++; return () => undefined }
    expect(await createDemoExportScenario('EXPORT_ERROR', handoff).run()).toBe('failed')
    const stale = createDemoExportScenario('EXPORT_STALE', handoff)
    const pending = stale.run()
    stale.changeAccessRevision()
    expect(await pending).toBe('stale')
    expect(handoffs).toBe(0)
  })
})

describe('D4 cancel fake boundary', () => {
  it('requires explicit confirmation and sends once, without optimistic row mutation', async () => {
    let sends = 0
    const port = createDemoCancelPort('CANCEL_CONFIRMED', () => { sends++ })
    const controller = createCancelQrController({ currentScope: () => d4Scope,
      canCancel: () => true, eligibleRow: () => true, port: () => port })
    expect(controller.request(d4CancelRow)).toBe(true)
    expect(sends).toBe(0)
    expect((await controller.confirm()).kind).toBe('confirmed')
    expect(sends).toBe(1)
    expect(d4CancelRow.statusCode).toBe(0)
  })

  it('keeps rejected and unknown outcomes explicit with no blind retry', async () => {
    for (const scenario of ['CANCEL_REJECTED', 'CANCEL_UNKNOWN'] as const) {
      let sends = 0
      const port = createDemoCancelPort(scenario, () => { sends++ })
      const controller = createCancelQrController({ currentScope: () => d4Scope,
        canCancel: () => true, eligibleRow: () => true, port: () => port })
      controller.request(d4CancelRow)
      expect((await controller.confirm()).kind).toBe(scenario === 'CANCEL_REJECTED' ? 'rejected' : 'unknown')
      expect((await controller.confirm()).kind).toBe('not-sent')
      expect(sends).toBe(1)
    }
  })

  it('suppresses a late response after permission and access revision loss', async () => {
    const gate = deferred()
    const started = deferred()
    let sends = 0
    let scope = d4Scope
    let permitted = true
    const port = createDemoCancelPort('CANCEL_PERMISSION_LOST', () => { sends++; started.resolve() }, gate.promise)
    const controller = createCancelQrController({ currentScope: () => scope,
      canCancel: () => permitted, eligibleRow: () => true, port: () => port })
    controller.request(d4CancelRow)
    const pending = controller.confirm()
    await started.promise
    permitted = false
    scope = { ...scope, accessRevision: 2 }
    gate.resolve()
    expect((await pending).kind).toBe('stale')
    expect(controller.getState().outcome.kind).toBe('idle')
    expect(sends).toBe(1)
  })
})

describe('D4 static preview data', () => {
  it('keeps arbitrary status raw and never exposes a canonical link', () => {
    const page = staticDemoPage('STATIC_UNKNOWN_STATUS', 0, 10)
    const html = renderToString(createElement(StaticQrResults, { terminalConfirmed: true,
      pending: false, error: false, data: page, page: 0,
      columnOrder: STATIC_QR_DEFAULT_COLUMN_ORDER,
      visibleColumnIds: STATIC_QR_DEFAULT_COLUMN_ORDER,
      onRetry: () => undefined,
      onPageChange: () => undefined }))
    expect(page.content[0]?.statusCode).toBe(777)
    expect(html).toContain('>Noma’lum<')
    expect(html).not.toContain('>777<')
    expect(html).not.toContain('Muvaffaqiyatli')
    expect(html).not.toContain('To‘lov havolasi QR kodi')
    expect(html).not.toContain('Havolani nusxalash')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('href=')
    expect(d4StaticRows.every((row) => row.link === null && row.redirectUrl === null)).toBe(true)
  })

  it('pauses a lost applied terminal without widening, and separates error from empty', () => {
    const applied = { terminalId: d4StaticTerminal.id, search: '', page: 0, size: 10 as const }
    expect(getStaticTerminalState(applied, { enabled: false, pending: false, error: false }))
      .toBe('unconfirmed')
    const render = (props: Partial<Parameters<typeof StaticQrResults>[0]>) => renderToString(
      createElement(StaticQrResults, { terminalConfirmed: true, pending: false, error: false,
        data: staticDemoPage('STATIC_NORMAL', 0, 10), page: 0,
        columnOrder: STATIC_QR_DEFAULT_COLUMN_ORDER,
        visibleColumnIds: STATIC_QR_DEFAULT_COLUMN_ORDER,
        onRetry: () => undefined,
        onPageChange: () => undefined, ...props }))
    expect(render({ terminalConfirmed: false })).not.toContain('D4-QR-DEMO-STATIC-001')
    expect(render({ error: true, data: undefined })).not.toContain('Statik QR topilmadi')
    expect(render({ data: staticDemoPage('STATIC_EMPTY', 0, 10) })).toContain('Statik QR topilmadi')
  })
})
