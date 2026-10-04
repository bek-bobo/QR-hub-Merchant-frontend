import { useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import type { LinkPresentation } from './create-result'
import { PaymentQrCode } from './PaymentQrCode'
import { QR_POSTER, renderQrPoster } from './qr-poster'

interface BrandedQrPosterProps {
  readonly validatedLink: Extract<LinkPresentation, { kind: 'available' }>
  readonly onReady: (canvas: HTMLCanvasElement | null) => void
}

export function BrandedQrPoster({ validatedLink, onReady }: BrandedQrPosterProps) {
  const qrRef = useRef<HTMLCanvasElement>(null)
  const [preview, setPreview] = useState<{ link: string; url: string } | null>(null)
  const [failedLink, setFailedLink] = useState<string | null>(null)
  const original = validatedLink.original

  useEffect(() => {
    let cancelled = false
    onReady(null)
    const frame = requestAnimationFrame(() => {
      void (async () => {
        try {
          if (!qrRef.current) throw new Error('QR unavailable')
          const canvas = await renderQrPoster(qrRef.current)
          const url = canvas.toDataURL('image/png')
          if (cancelled) return
          setPreview({ link: original, url })
          setFailedLink(null)
          onReady(canvas)
        } catch {
          if (!cancelled) setFailedLink(original)
        }
      })()
    })
    return () => { cancelled = true; cancelAnimationFrame(frame) }
  }, [original, onReady])

  return <div role="group" aria-label="QRHUB to‘lov plakati" className="mx-auto w-full max-w-md overflow-hidden rounded-2xl shadow-sm"
    style={{ aspectRatio: `${QR_POSTER.width} / ${QR_POSTER.height}`, backgroundColor: QR_POSTER.background }}>
    <div className="hidden" aria-hidden="true">
      <QRCodeCanvas ref={qrRef} value={original} size={600} level="M" marginSize={4}
        fgColor="#000000" bgColor="#FFFFFF" />
    </div>
    <span className="sr-only" lang="uz">{QR_POSTER.topLines.join(' ')}</span>
    <span className="sr-only" lang="ru">{QR_POSTER.bottomLines.join(' ')}</span>
    {failedLink === original ? <div className="flex h-full flex-col justify-center gap-3 bg-white p-4 text-center text-text-primary">
      <PaymentQrCode validatedLink={validatedLink} />
      <p role="alert" className="text-sm">QR plakatini tayyorlab bo‘lmadi. Oynani qayta ochib ko‘ring.</p>
    </div> : preview?.link === original ? <img src={preview.url}
      alt="QRHUB — to‘lov havolasi QR kodi" className="block h-auto w-full" />
      : <div role="status" className="flex h-full items-center justify-center p-4 text-sm text-white">QR plakati tayyorlanmoqda…</div>}
  </div>
}
