import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { P5ResetDialog } from './P5ResetDialog'
import { createLiveP5ResetPort, createP5ResetController, type P5ResetState } from './p5-reset'
import type { P5Row } from '@/shared/contracts/p5-read'

vi.mock('radix-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('radix-ui')>()
  const part = ({ children, className }: { children?: ReactNode; className?: string }) => <div className={className}>{children}</div>
  const root = ({ children, className, role }: { children: ReactNode; className?: string; role?: string }) => <div role={role} className={className}>{children}</div>
  return { ...actual, Toast: { Provider: part, Root: root, Title: part, Description: part, Action: part, Close: part, Viewport: part } }
})

vi.mock('@/shared/ui/DetailsDialog', () => ({
  DetailsDialogShell: ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) =>
    <section role="dialog"><h2>{title}</h2><p>{subtitle}</p>{children}</section>,
  DetailsBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

const intent = { deviceId: '00AbC', description: 'Front desk', terminalName: 'Terminal A',
  scope: { source: 'live' as const, sessionScopeId: 'a', accessRevision: 1 } }
const render = (state: P5ResetState) => renderToString(<P5ResetDialog state={state}
  onCancel={() => undefined} onConfirm={() => undefined} onAcknowledgeUnknown={() => undefined} />).replaceAll('&#x27;', "'")

describe('P5 reset dialog', () => {
  it('shows current row context and explicit confirmation without PIN or OTP inputs', () => {
    const html = render({ dialogOpen: true, intent, outcome: { kind: 'idle' }, refresh: 'idle' })
    for (const text of ['PINni tiklash', '00AbC', 'Front desk', 'Terminal A', 'Bekor qilish', 'Davom etasizmi?']) {
      expect(html).toContain(text)
    }
    expect(html).not.toContain('<input')
    expect(html).not.toContain('OTP')
  })

  it('keeps pending confirmation visible with disabled actions and a loading message', () => {
    const html = render({ dialogOpen: true, intent, outcome: { kind: 'pending' }, refresh: 'idle' })
    expect(html).toContain('role="dialog"')
    expect(html).toContain('Tiklanmoqda…')
    expect(html).toContain('PIN reset so‘rovi yuborilmoqda')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
  })

  it('shows semantic success feedback with the row device ID after confirmation', () => {
    const html = render({ dialogOpen: false, intent, outcome: { kind: 'confirmed', data: undefined }, refresh: 'updated' })
    expect(html).not.toContain('role="dialog"')
    expect(html).toContain('role="status"')
    expect(html).toContain("Reset OTP jo'natildi")
    expect(html).not.toContain('PIN muvaffaqiyatli tiklandi')
    expect(html).not.toContain('PIN reset bajarildi')
    expect(html).toContain('fixed right-4 top-4')
    expect(html).toContain('Bildirishnomani yopish')
    expect(html).toContain('00AbC qurilmasi uchun reset OTP yuborildi. Kodni P5 qurilmaga kiriting.')
    expect(html).toContain('bg-status-success-indicator')
  })

  it.each(['rejected', 'unknown', 'not-sent'] as const)('shows safe destructive feedback and explicit retry for %s', (kind) => {
    const html = render({ dialogOpen: false, intent, outcome: { kind, reason: 'raw technical secret' }, refresh: 'idle' })
    expect(html).toContain('role="alert"')
    expect(html).toContain('Reset OTP yuborilmadi')
    expect(html).toContain('bg-status-error-indicator')
    expect(html).not.toContain('raw technical secret')
    expect(html).not.toContain("Reset OTP jo'natildi")
    expect(html).toContain('00AbC qurilmasi uchun reset OTP yuborishda xatolik yuz berdi.')
    expect(html).toContain('fixed right-4 top-4')
    expect(html).toContain('Bildirishnomani yopish')
    if (kind === 'unknown') expect(html).toContain('Takrorlash yangi reset so‘rovini yuboradi')
    else expect(html).toContain('Qayta urinish')
  })
})


describe('P5 reset envelope to toast', () => {
  const row: P5Row = { deviceId: intent.deviceId, description: null, deviceStatus: 0,
    terminalId: 'terminal-id', terminalName: 'Terminal A', terminalType: 'P5', merchantName: 'Merchant A',
    staticQrId: null, staticQrLink: null, staticQrStatus: null, createdAt: '2026-10-05T12:00:00' }
  it.each([
    [{ success: true, error: null, data: null }, 200, false, true],
    [{ success: false, error: { text: 'java.lang.Exception https://internal.example' }, data: null }, 200, false, false],
    [{ success: true, error: null, data: null }, 500, false, false],
    [{}, 200, false, false],
    [null, 200, true, false],
  ] as const)('uses business success and safe failure copy for response %#', async (body, status, networkFailure, success) => {
    const port = createLiveP5ResetPort({
      transport: { request: async () => {
        if (networkFailure) throw new Error('private transport detail')
        return { ok: status >= 200 && status < 300, status, headers: { contentType: 'application/json', requestId: null }, body }
      } },
      protectedMutation: async (operation) => ({ status: 'success', data: await operation({ accessToken: 'test', signal: new AbortController().signal }) }),
      recheck: () => true,
    })
    const controller = createP5ResetController({ currentScope: () => intent.scope, canRead: () => true,
      canReset: () => true, currentRow: () => row, port: () => port, invalidateConfirmed: async () => undefined })
    expect(controller.request(row)).toBe(true)
    await controller.confirm()
    const html = render(controller.getState())
    expect(html).toContain(success ? "Reset OTP jo'natildi" : 'Reset OTP yuborilmadi')
    expect(html).toContain(row.deviceId)
    expect(html).not.toContain(success ? 'Reset OTP yuborilmadi' : "Reset OTP jo'natildi")
    expect(html).not.toContain('java.lang.Exception')
    expect(html).not.toContain('internal.example')
    expect(html).not.toContain('private transport detail')
  })
})
