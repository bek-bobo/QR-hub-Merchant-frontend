import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { decodeTerminalPage } from '@/shared/contracts/management-read'
import { copyExactPresentedLink, presentQrLink } from '@/features/dynamic-qr/qr-presentation'
import detailsSource from './TerminalDetailsSheet.tsx?raw'
import dialogSource from './TerminalQrDialog.tsx?raw'
import pageSource from './TerminalPage.tsx?raw'
import { TerminalDetailsContent } from './TerminalDetailsSheet'
import { TerminalQrContent } from './TerminalQrDialog'

const qr = vi.hoisted(() => ({ value: null as string | null }))
vi.mock('qrcode.react', () => ({ QRCodeCanvas: ({ value }: { value: string }) => {
  qr.value = value
  return <canvas data-payment-qr="true" />
}, QRCodeSVG: () => <svg /> }))

function terminal(overrides: Record<string, unknown> = {}) {
  const result = decodeTerminalPage({ success: true, data: {
    content: [{ pkey: 'terminal-EXACT', name: 'Terminal A', status: 0,
      merchantId: 12, merchantName: 'Merchant A', bankAccountId: 34, bankAccountName: 'Bank A',
      terminalType: 'WEB', mccCode: '005411', regionId: 7, regionName: 'Viloyat A',
      districtId: '008', districtName: 'Tuman A', address: 'Ko‘cha 123',
      staticQrId: 'QR-metadata-only', staticQrLink: 'https://pay.example/QR/%2f?Case=YES#Exact',
      phones: ['998901234567', '+998931234567'], createdAt: '2026-10-01T10:15:20',
      updatedAt: null, ...overrides }], totalElements: 1, totalPages: 1, page: 0, size: 10,
  } })
  const row = result.content[0]
  if (!row) throw new Error('Expected terminal fixture')
  return row
}

describe('terminal loaded-row details and QR', () => {
  it('renders grouped loaded details, formatted phones, dates and null fallbacks', () => {
    const row = terminal()
    const html = renderToStaticMarkup(<TerminalDetailsContent row={row} onViewQr={() => undefined} />)
    for (const value of ['terminal-EXACT', 'Terminal A', 'Merchant A', 'Bank A', 'WEB', '005411',
      'Viloyat A', 'Tuman A', '008', 'Ko‘cha 123', 'QR-metadata-only', '01.10.2026 10:15']) {
      expect(html).toContain(value)
    }
    expect(html).toContain('+998 90 123 45 67')
    expect(html).toContain('+998 93 123 45 67')
    expect(html.match(/<li>/g)).toHaveLength(2)
    expect(html).toContain('>—<')
    expect(html).toContain(row.staticQrLink)
    expect(html).not.toContain(JSON.stringify(row.phones))
  })

  it('uses the exact backend URL for QR rendering and copy, never metadata IDs', async () => {
    const row = terminal()
    qr.value = null
    const html = renderToStaticMarkup(<TerminalQrContent row={row} />)
    expect(qr.value).toBe(row.staticQrLink)
    expect(qr.value).not.toContain(row.staticQrId)
    expect(html).toContain('data-payment-qr="true"')
    expect(html).toContain('QRHUB to‘lov plakati')
    expect(html).toContain('PDF yuklab olish')
    expect(html).toContain('PNG yuklab olish')
    expect(html).toContain(row.staticQrLink)
    expect(html).toContain('Havolani nusxalash')
    expect(html).toContain(row.pkey)
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await copyExactPresentedLink(presentQrLink(row.staticQrLink), writeText)).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(row.staticQrLink)
  })

  it.each([null, '', 'http://pay.example/qr', 'javascript:alert(1)', 'https://user:secret@pay.example/qr'])(
    'disables QR and copy for unavailable/unsafe link %s', async (staticQrLink) => {
      const row = terminal({ staticQrLink })
      qr.value = null
      const html = renderToStaticMarkup(<TerminalQrContent row={row} />)
      expect(qr.value).toBeNull()
      expect(html).not.toContain('data-payment-qr')
      expect(html).not.toContain('Havolani nusxalash')
      expect(html).toContain('xavfsiz Statik QR havolasi mavjud emas')
      const details = renderToStaticMarkup(<TerminalDetailsContent row={row} onViewQr={() => undefined} />)
      expect(details).not.toContain('>Statik QR ko‘rish</button>')
      const writeText = vi.fn()
      expect(await copyExactPresentedLink(presentQrLink(row.staticQrLink), writeText)).toBe('unavailable')
      expect(writeText).not.toHaveBeenCalled()
    },
  )

  it('shows unavailable fields without null, NaN or raw empty arrays', () => {
    const row = terminal({ phones: null, staticQrLink: null, terminalType: null, mccCode: null,
      address: null, regionId: null, regionName: null, districtId: null, districtName: null,
      staticQrId: null, createdAt: null })
    const html = renderToStaticMarkup(<TerminalDetailsContent row={row} onViewQr={() => undefined} />)
    expect(html).toContain('>—<')
    for (const text of ['>null<', '>undefined<', '>NaN<', '[]']) expect(html).not.toContain(text)
  })

  it('keeps presentation free of detail requests and wires loaded rows in the page', () => {
    for (const source of [detailsSource, dialogSource]) {
      expect(source).not.toMatch(/\bfetch\s*\(|\buseQuery\s*\(|\brefetch\s*\(|\bqueryKey\s*:/)
    }
    expect(pageSource).toContain('onViewQr={setQrRow}')
    expect(pageSource).toContain('onViewDetails={setDetailsRow}')
    expect(pageSource).toContain('<TerminalQrDialog row={qrRow}')
    expect(pageSource).toContain('<TerminalDetailsSheet row={detailsRow}')
  })
})
