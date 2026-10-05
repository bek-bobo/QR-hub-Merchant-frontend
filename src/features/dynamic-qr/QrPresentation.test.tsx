import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { validateCreateLink } from './create-result'
import { QrPresentation } from './QrPresentation'
import { copyExactPresentedLink } from './qr-presentation'

const { qrCalls } = vi.hoisted(() => ({
  qrCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock('qrcode.react', () => ({
  QRCodeCanvas: (props: Record<string, unknown>) => {
    qrCalls.push(props)
    return <canvas data-testid="poster-source-qr" />
  },
  QRCodeSVG: (props: Record<string, unknown>) => {
    qrCalls.push(props)
    return <svg data-testid="shared-payment-qr" />
  },
}))

const original = 'https://qrhub.uz/Exact/%2fPath?type=02&case=MiXeD#Part%2FOne'

beforeEach(() => { qrCalls.length = 0 })

describe('shared QR presentation', () => {
  it('keeps the link below the left info card and bilingual branding inside the bounded right QR panel', () => {
    const link = validateCreateLink(original)
    const html = renderToString(<QrPresentation qrId="qr-1" terminalName="Terminal A"
      amountLabel="5 000.00 UZS" statusLabel="Muddati o‘tgan" link={link}
      unavailableMessage="Unavailable" onCopy={async () => 'copied'}
      footer={<button type="button">Yopish</button>} />)

    expect(html).toContain('md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]')
    expect(html).toContain('max-w-md')
    expect(html).toContain('background-color:#FA0A4B')
    expect(html).toContain('aspect-ratio:620 / 877')
    expect(html).toContain('BU YERDA QR - KOD YORDAMIDA')
    expect(html).toContain('ЗДЕСЬ МОЖНО ОПЛАТИТЬ')
    expect(html).toContain('lang="uz"')
    expect(html).toContain('lang="ru"')
    expect(html.indexOf('aria-label="Kanonik havola"')).toBeGreaterThan(html.indexOf('</dl>'))
    expect(html.indexOf('Kanonik havola')).toBeLessThan(html.indexOf('PDF yuklab olish'))
    expect(html.indexOf('PNG yuklab olish')).toBeLessThan(html.indexOf('BU YERDA QR'))
    expect(html).toContain('QRHUB')
    expect(html).toContain('PDF yuklab olish')
    expect(html).toContain('PNG yuklab olish')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
    expect(html).toContain('aria-label="Havolani nusxalash"')
    expect(html).toContain(`title="${original.replaceAll('&', '&amp;')}"`)
    expect(html).toContain('Havolani nusxalash')
    expect(html).toContain('Terminal A')
    expect(html).toContain('5 000.00 UZS')
    expect(html).toContain('Muddati o‘tgan')
    expect(html).toContain('Yopish')
    expect(qrCalls).toHaveLength(1)
    expect(qrCalls[0]).toMatchObject({ value: original, size: 600,
      marginSize: 4, level: 'M', fgColor: '#000000', bgColor: '#FFFFFF' })
  })

  it('uses the branded poster and both exports by default for every presentation', () => {
    const html = renderToString(<QrPresentation qrId="qr-1" terminalName="Terminal A"
      link={validateCreateLink(original)} unavailableMessage="Unavailable" />)
    expect(html).toContain('QR ma’lumotlari')
    expect(html).toContain('BU YERDA QR')
    expect(html).toContain('ЗДЕСЬ МОЖНО ОПЛАТИТЬ')
    expect(html).toContain('PDF yuklab olish')
    expect(html).toContain('PNG yuklab olish')
    expect(html).not.toContain('Summa')
    expect(html).not.toContain('Status')
    expect(qrCalls[0].size).toBe(600)
  })

  it('preserves the unavailable state in the shared layout', () => {
    const html = renderToString(<QrPresentation qrId="qr-1" terminalName="Terminal A"
      link={{ kind: 'unavailable' }} unavailableMessage="Unavailable" />)
    expect(html).toContain('Unavailable')
    expect(html).not.toContain('Kanonik havola')
    expect(html).not.toContain('BU YERDA QR')
    expect(html).not.toContain('PNG yuklab olish')
    expect(qrCalls).toHaveLength(0)
  })

  it('passes each current link to the poster and keeps downloads disabled until its canvas is ready', () => {
    const next = 'https://qrhub.uz/Next%2Fqr?Case=Keep#Receipt'
    for (const current of [original, next]) {
      const html = renderToString(<QrPresentation qrId="qr-1" terminalName="Terminal A"
        link={validateCreateLink(current)} unavailableMessage="Unavailable" />)
      expect(html.match(/disabled=""/g)).toHaveLength(2)
    }
    expect(qrCalls.map((call) => call.value)).toEqual([original, next])
  })

  it('renders and copies the exact policy-approved HTTPS link', async () => {
    const link = validateCreateLink(original)
    const html = renderToString(<QrPresentation qrId="qr-1" terminalName="Terminal A"
      amountLabel="1 000.00 UZS" link={link} unavailableMessage="Unavailable"
      onCopy={async () => 'copied'} />)

    expect(html).toContain('data-testid="poster-source-qr"')
    expect(html).toContain('Havolani nusxalash')
    expect(qrCalls).toHaveLength(1)
    expect(qrCalls[0].value).toBe(original)

    const written: string[] = []
    expect(await copyExactPresentedLink(link, async (text) => { written.push(text) })).toBe('copied')
    expect(written).toEqual([original])
  })

  it.each(['', 'javascript:alert(1)', '/relative', 'https://user:pass@qrhub.uz/pay'])
  ('renders an unavailable state without QR or copy for %s', (unsafe) => {
    const link = validateCreateLink(unsafe)
    const html = renderToString(<QrPresentation qrId="qr-1" terminalName="Terminal A"
      amountLabel="1 000.00 UZS" link={link} unavailableMessage="Unavailable" />)

    expect(html).toContain('Unavailable')
    expect(html).not.toContain('Havolani nusxalash')
    expect(qrCalls).toHaveLength(0)
  })
})
