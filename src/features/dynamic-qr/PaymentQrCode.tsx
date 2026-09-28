import { QRCodeSVG } from 'qrcode.react'
import type { LinkPresentation } from './create-result'

interface PaymentQrCodeProps {
  readonly validatedLink: Extract<LinkPresentation, { kind: 'available' }>
}

export function PaymentQrCode({ validatedLink }: PaymentQrCodeProps) {
  return <div className="mx-auto w-full max-w-60">
    <QRCodeSVG
      value={validatedLink.original}
      size={240}
      level="M"
      marginSize={4}
      fgColor="#000000"
      bgColor="#FFFFFF"
      title="To‘lov havolasi QR kodi"
      className="block h-auto max-w-full"
    />
  </div>
}
