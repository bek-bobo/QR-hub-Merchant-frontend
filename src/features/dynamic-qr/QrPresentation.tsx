import { useCallback, useState, type ReactNode } from 'react'
import { CopyIcon, QrCodeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LinkPresentation } from './create-result'
import { PaymentQrCode } from './PaymentQrCode'
import { BrandedQrPoster } from './BrandedQrPoster'
import { QrPosterDownloads } from './QrPosterDownloads'
import type { QrCopyOutcome } from './qr-presentation'

interface QrPresentationProps {
  readonly qrId: string
  readonly terminalName: string
  readonly merchantName?: string
  readonly amountLabel?: string
  readonly statusLabel?: string
  readonly link: LinkPresentation
  readonly unavailableMessage: string
  readonly onCopy?: () => Promise<QrCopyOutcome>
  readonly footer?: ReactNode
  readonly emphasizeQr?: boolean
}

export function QrPresentation({
  qrId,
  terminalName,
  merchantName,
  amountLabel,
  statusLabel,
  link,
  unavailableMessage,
  onCopy,
  footer,
  emphasizeQr = false,
}: QrPresentationProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const original = link.kind === 'available' ? link.original : null
  const [poster, setPoster] = useState<{ original: string; canvas: HTMLCanvasElement } | null>(null)
  const onPosterReady = useCallback((canvas: HTMLCanvasElement | null) => {
    setPoster(canvas && original ? { original, canvas } : null)
  }, [original])
  const readyPoster = poster?.original === original ? poster?.canvas ?? null : null

  async function copyLink() {
    if (!onCopy || link.kind !== 'available') return
    const outcome = await onCopy()
    if (outcome === 'stale') return
    setCopyStatus(outcome === 'copied'
      ? 'Havola nusxalandi.'
      : 'Havolani nusxalab bo‘lmadi.')
  }

  const canonicalLink = link.kind === 'available' ? <div className={emphasizeQr ? 'min-w-0 rounded-xl border bg-surface p-3' : 'rounded-xl border bg-surface p-3'}>
    <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Kanonik havola</p>
    <div className={emphasizeQr ? 'mt-2 flex min-w-0 items-center gap-2' : 'mt-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start'}>
      <p title={emphasizeQr ? link.original : undefined} className={cn('min-w-0 flex-1 text-sm text-text-primary', emphasizeQr
        ? 'truncate'
        : 'break-all leading-6 [overflow-wrap:anywhere]')}>
        {link.original}
      </p>
      {onCopy ? <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => void copyLink()}>
        <CopyIcon aria-hidden="true" />
        Havolani nusxalash
      </Button> : null}
    </div>
    {copyStatus ? <p role="status" className="mt-2 text-sm text-text-secondary">{copyStatus}</p> : null}
  </div> : null

  return <div className={emphasizeQr ? 'space-y-3' : 'space-y-5'}>
    <div className={cn('grid gap-5', emphasizeQr
      ? 'sm:grid-cols-[minmax(0,1fr)_20rem] sm:items-start'
      : 'md:grid-cols-[minmax(0,1fr)_17rem] md:items-center')}>
      <div className={emphasizeQr ? 'min-w-0 space-y-4' : 'min-w-0'}>
      <dl className="grid min-w-0 gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">QR ID</dt>
          <dd className="mt-1 break-all font-medium text-text-primary">{qrId}</dd>
        </div>
        <div className={emphasizeQr ? 'min-w-0' : undefined}>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Terminal</dt>
          <dd className={cn('mt-1 font-medium text-text-primary', emphasizeQr && 'break-words')}>{terminalName}</dd>
        </div>
        {merchantName ? <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Merchant</dt>
          <dd className="mt-1 font-medium text-text-primary">{merchantName}</dd>
        </div> : null}
        {amountLabel ? <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Summa</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-text-primary">{amountLabel}</dd>
        </div> : null}
        {statusLabel ? <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Status</dt>
          <dd className="mt-1 font-medium text-text-primary">{statusLabel}</dd>
        </div> : null}
      </dl>
        {emphasizeQr ? canonicalLink : null}
        {emphasizeQr && link.kind === 'available' ? <QrPosterDownloads key={original}
          poster={readyPoster} qrId={qrId} /> : null}
      </div>

      {link.kind === 'available' ? (
        emphasizeQr ? <BrandedQrPoster validatedLink={link} onReady={onPosterReady} />
          : <div className="mx-auto w-full max-w-[17rem] rounded-2xl border bg-white p-3 shadow-sm">
            <PaymentQrCode validatedLink={link} />
          </div>
      ) : (
        <div role="status" className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/30 p-6 text-center text-text-secondary">
          <QrCodeIcon className="size-10" aria-hidden="true" />
          <p className="text-sm">{unavailableMessage}</p>
        </div>
      )}
    </div>

    {!emphasizeQr ? canonicalLink : null}

    {footer ? <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">{footer}</div> : null}
  </div>
}
