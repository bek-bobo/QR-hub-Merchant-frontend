import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { validateCreateLink } from './create-result'
import { QrPresentation } from './QrPresentation'
import { copyExactPresentedLink } from './qr-presentation'

const { qrCalls } = vi.hoisted(() => ({
  qrCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: (props: Record<string, unknown>) => {
    qrCalls.push(props)
    return <svg data-testid="shared-payment-qr" />
  },
}))

const original = 'https://qrhub.uz/Exact/%2fPath?type=02&case=MiXeD#Part%2FOne'

beforeEach(() => { qrCalls.length = 0 })

describe('shared QR presentation', () => {
  it('renders and copies the exact policy-approved HTTPS link', async () => {
    const link = validateCreateLink(original)
    const html = renderToString(<QrPresentation qrId="qr-1" terminalName="Terminal A"
      amountLabel="1 000.00 UZS" link={link} unavailableMessage="Unavailable"
      onCopy={async () => 'copied'} />)

    expect(html).toContain('data-testid="shared-payment-qr"')
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
