import { useDynamicQrPresentation } from './presentation'
import { QRCodeSVG } from 'qrcode.react'
import type { LinkPresentation } from './create-result'

interface PaymentQrCodeProps {
  readonly validatedLink: Extract<LinkPresentation, { kind: 'available' }>
  readonly size?: number
}

export function PaymentQrCode({ validatedLink, size = 240 }: PaymentQrCodeProps) {
  const p = useDynamicQrPresentation()
  return <div className="mx-auto w-full" style={{ maxWidth: size }}>
    <QRCodeSVG
      value={validatedLink.original}
      size={size}
      level="M"
      marginSize={4}
      fgColor="#000000"
      bgColor="#FFFFFF"
      title={p.message('display.qrTitle')}
      className="block h-auto max-w-full"
    />
  </div>
}
