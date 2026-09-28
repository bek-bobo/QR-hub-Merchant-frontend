import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { P5ResetDialog } from './P5ResetDialog'

describe('P5 reset dialog', () => {
  it('shows only current target context and explicit reset controls', () => {
    const html = renderToString(createElement(P5ResetDialog, {
      state: { dialogOpen: true, intent: { deviceId: '00AbC', description: 'Front desk', terminalName: 'Terminal A', scope: { source: 'live', sessionScopeId: 'a', accessRevision: 1 } }, outcome: { kind: 'idle' }, refresh: 'idle' },
      onCancel: () => undefined, onConfirm: () => undefined, onAcknowledgeUnknown: () => undefined,
    }))
    expect(html).toContain('Qurilma PIN’ini reset qilish')
    expect(html).toContain('00AbC')
    expect(html).toContain('Front desk')
    expect(html).toContain('Terminal A')
    expect(html).toContain('Bekor qilish')
    expect(html).toContain('PIN resetni tasdiqlash')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('OTP')
    expect(html).not.toContain('yangi PIN')
  })

  it('uses conservative confirmed and retained unknown copy', () => {
    const base = { dialogOpen: false, intent: null, refresh: 'idle' as const }
    expect(renderToString(createElement(P5ResetDialog, { state: { ...base, outcome: { kind: 'confirmed', data: undefined } }, onCancel: () => undefined, onConfirm: () => undefined, onAcknowledgeUnknown: () => undefined }))).toContain('bajarilgan deb qayd etildi')
    expect(renderToString(createElement(P5ResetDialog, { state: { ...base, outcome: { kind: 'unknown', reason: 'x' } }, onCancel: () => undefined, onConfirm: () => undefined, onAcknowledgeUnknown: () => undefined }))).toContain('Takrorlash yangi reset so‘rovini yuboradi')
  })
})
