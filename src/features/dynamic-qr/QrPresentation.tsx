import { useCallback, useState, type ReactNode } from 'react'
import { QrCodeIcon } from 'lucide-react'
import type { LinkPresentation } from './create-result'
import { BrandedQrPoster } from './BrandedQrPoster'
import { QrPosterDownloads } from './QrPosterDownloads'
import { QrDetailsCard, type QrDetailsCardProps } from './QrDetailsCard'
import { CanonicalLinkCard } from './CanonicalLinkCard'
import type { QrCopyOutcome } from './qr-presentation'

interface QrPresentationProps extends QrDetailsCardProps {
  readonly link: LinkPresentation
  readonly unavailableMessage: string
  readonly onCopy?: () => Promise<QrCopyOutcome>
  readonly footer?: ReactNode
}

export function QrPresentation({ link, unavailableMessage, onCopy, footer, ...metadata }: QrPresentationProps) {
  const original = link.kind === 'available' ? link.original : null
  const [poster, setPoster] = useState<{ original: string; canvas: HTMLCanvasElement } | null>(null)
  const onPosterReady = useCallback((canvas: HTMLCanvasElement | null) => {
    setPoster(canvas && original ? { original, canvas } : null)
  }, [original])
  const readyPoster = poster?.original === original ? poster?.canvas ?? null : null

  return <div className="space-y-6 md:space-y-3">
    <div className="grid min-w-0 items-start gap-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <QrDetailsCard key={metadata.qrId} {...metadata} />
        {link.kind === 'available' ? <>
          <CanonicalLinkCard key={`link:${original}`} original={link.original} onCopy={onCopy} />
          <QrPosterDownloads key={`downloads:${original}`} poster={readyPoster} qrId={metadata.qrId} />
        </> : null}
      </div>
      {link.kind === 'available' ? <BrandedQrPoster validatedLink={link} onReady={onPosterReady} />
        : <div role="status" className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/30 p-6 text-center text-text-secondary">
          <QrCodeIcon className="size-10" aria-hidden="true" /><p className="text-sm">{unavailableMessage}</p>
        </div>}
    </div>
    {footer ? <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end md:pt-3">{footer}</div> : null}
  </div>
}
