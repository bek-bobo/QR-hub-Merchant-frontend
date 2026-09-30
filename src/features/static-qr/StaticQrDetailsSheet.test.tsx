import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StaticQrRow } from './contract'
import { StaticQrDetailsContent } from './StaticQrDetailsSheet'

const row: StaticQrRow = {
  id: 'STATIC-QR-1', terminalType: 'WEB', terminalId: 'terminal-1',
  terminalName: 'Terminal A', merchantId: '42', merchantName: 'Merchant A',
  redirectUrl: 'https://merchant.example/return?exact=Yes', minAmount: 100000,
  maxAmount: '2000000000', statusCode: 0,
  link: 'https://pay.example/qr?exact=Yes', districtId: '7', districtName: 'Tuman A',
  regionId: '8', regionName: 'Viloyat A', createdAt: '2026-09-30T10:15:20',
  updatedAt: null,
}

describe('StaticQrDetailsContent', () => {
  it('renders confirmed details, exact links and null fallbacks from the loaded row', () => {
    const html = renderToString(<StaticQrDetailsContent row={row} onViewQr={() => undefined} />)

    expect(html).toContain('STATIC-QR-1')
    expect(html).toContain('Terminal A')
    expect(html).toContain('Merchant A')
    expect(html).toContain('Viloyat A')
    expect(html).toContain('Tuman A')
    expect(html).toContain('100000')
    expect(html).toContain('2000000000')
    expect(html).toContain('https://pay.example/qr?exact=Yes')
    expect(html).toContain('https://merchant.example/return?exact=Yes')
    expect(html).toContain('30.09.2026 10:15')
    expect(html).toContain('>—<')
    expect(html).toContain('>QR ko‘rish</button>')
  })

  it('does not expose a QR action for a missing or unsafe QR link', () => {
    for (const link of [null, 'http://pay.example/qr'] as const) {
      const html = renderToString(<StaticQrDetailsContent row={{ ...row, link }} onViewQr={() => undefined} />)
      expect(html).not.toContain('>QR ko‘rish</button>')
      expect(html).not.toContain('Havolani nusxalash')
    }
  })
})
