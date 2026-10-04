import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { CreateQrControllerState } from './create-qr'
import { CreateQrResult } from './CreateQrResult'
import { PaymentQrCode } from './PaymentQrCode'
import { presentCreateResult, validateCreateLink, type CreateResultModel } from './create-result'

const { qrCalls } = vi.hoisted(() => ({
  qrCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: (props: Record<string, unknown>) => {
    qrCalls.push(props)
    return <svg data-testid="payment-qr" aria-label={String(props.title)} />
  },
}))

const scope: ReadScope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const original = 'https://EXAMPLE.test/Pay/%2f?signature=a%2Bb&case=MiXeD#Receipt%2FOne'
const confirmed: CreateQrControllerState = {
  outcome: { kind: 'confirmed', data: { pkey: 'opaque-pkey', link: original } },
  intent: { terminalName: 'Terminal A', amountMinor: '100001', currencyCode: 'UZS', scope },
  closed: false,
}

function renderResult(result: CreateResultModel, currentScope: ReadScope = scope, canCreate = true) {
  return renderToString(<CreateQrResult result={result} currentScope={() => currentScope}
    canCreate={() => canCreate} onClose={() => undefined} onNewIntent={() => undefined} />)
}

beforeEach(() => { qrCalls.length = 0 })

describe('payment QR presentation boundary', () => {
  it('accepts a larger SVG size while preserving the payload and quiet zone', () => {
    const validatedLink = validateCreateLink(original, ['https:'])
    if (validatedLink.kind !== 'available') throw Error('Expected an accepted fixture link')
    const html = renderToString(<PaymentQrCode validatedLink={validatedLink} size={384} />)
    expect(html).toContain('max-width:384px')
    expect(qrCalls[0]).toMatchObject({ value: original, size: 384, marginSize: 4,
      fgColor: '#000000', bgColor: '#FFFFFF', className: 'block h-auto max-w-full' })
  })

  it('renders a local SVG for a confirmed result with a policy-accepted link', () => {
    const result = presentCreateResult(confirmed, ['https:'])!
    const html = renderResult(result)
    expect(html).toContain('data-testid="payment-qr"')
    expect(qrCalls).toHaveLength(1)
  })

  it('passes the exact original link including case, path, query, percent encoding and fragment', () => {
    renderResult(presentCreateResult(confirmed, ['https:'])!)
    expect(qrCalls[0].value).toBe(original)
  })

  it('does not mutate the already validated renderer input', () => {
    const validatedLink = validateCreateLink(original, ['https:'])
    if (validatedLink.kind !== 'available') throw Error('Expected an accepted fixture link')
    renderToString(<PaymentQrCode validatedLink={validatedLink} />)
    expect(qrCalls[0].value).toBe(validatedLink.original)
    expect(validatedLink.original).toBe(original)
  })

  it('uses a square, high-contrast SVG with a four-module quiet zone and accessible title', () => {
    renderResult(presentCreateResult(confirmed, ['https:'])!)
    expect(qrCalls[0]).toMatchObject({
      size: 240, level: 'M', marginSize: 4, fgColor: '#000000', bgColor: '#FFFFFF',
      title: 'To‘lov havolasi QR kodi', className: 'block h-auto max-w-full',
    })
  })

  it('retains textual QR ID, terminal, amount, link and copy action next to QR', () => {
    const html = renderResult(presentCreateResult(confirmed, ['https:'])!)
    expect(html).toContain('opaque-pkey')
    expect(html).toContain('Terminal A')
    expect(html).toContain('UZS')
    expect(html).toContain('signature=a%2Bb')
    expect(html).toContain('Havolani nusxalash')
  })

  it.each(['javascript:alert(1)', 'https://user:pass@example.test/pay', ' /relative'])
  ('never renders QR for an unsafe or unavailable link: %s', (link) => {
    const state: CreateQrControllerState = { ...confirmed,
      outcome: { kind: 'confirmed', data: { pkey: 'opaque-pkey', link } } }
    const html = renderResult(presentCreateResult(state, ['https:'])!)
    expect(html).toContain('QR yaratildi, lekin havolani xavfsiz ko‘rsatib bo‘lmadi.')
    expect(qrCalls).toHaveLength(0)
  })

  it('uses the approved live HTTPS policy without mutating the canonical link', () => {
    const html = renderResult(presentCreateResult(confirmed)!)
    expect(html).toContain('QR ko‘rsatish')
    expect(html).toContain('signature=a%2Bb')
    expect(qrCalls).toHaveLength(1)
    expect(qrCalls[0].value).toBe(original)
  })

  it('never renders QR for an unknown outcome', () => {
    const state: CreateQrControllerState = { ...confirmed, outcome: { kind: 'unknown', reason: 'uncertain' } }
    expect(renderResult(presentCreateResult(state, ['https:'])!)).toContain('Natija tasdiqlanmadi')
    expect(qrCalls).toHaveLength(0)
  })

  it('never renders QR after scope replacement or permission loss', () => {
    const result = presentCreateResult(confirmed, ['https:'])!
    expect(renderResult(result, { ...scope, accessRevision: 2 })).toBe('')
    expect(renderResult(result, scope, false)).toBe('')
    expect(qrCalls).toHaveLength(0)
  })

  it.each(['rejected', 'not-sent'] as const)('never renders QR for %s', (kind) => {
    const state: CreateQrControllerState = { ...confirmed, outcome: { kind, reason: 'No create result' } }
    expect(renderResult(presentCreateResult(state, ['https:'])!)).toContain('QR yaratilmadi')
    expect(qrCalls).toHaveLength(0)
  })
})
