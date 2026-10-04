import { useState } from 'react'
import { DownloadIcon, FileDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadPosterPdf, downloadPosterPng } from './qr-poster-download'

interface QrPosterDownloadsProps {
  readonly poster: HTMLCanvasElement | null
  readonly qrId: string
}

export function QrPosterDownloads({ poster, qrId }: QrPosterDownloadsProps) {
  const [pending, setPending] = useState<'pdf' | 'png' | null>(null)
  const [failed, setFailed] = useState(false)

  async function download(format: 'pdf' | 'png') {
    if (!poster || pending) return
    setPending(format)
    setFailed(false)
    const name = `qrhub-qr-${qrId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'payment'}`
    try {
      if (format === 'pdf') await downloadPosterPdf(poster, `${name}.pdf`)
      else downloadPosterPng(poster, `${name}.png`)
    } catch { setFailed(true) } finally { setPending(null) }
  }

  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" disabled={!poster || pending !== null}
        aria-busy={pending === 'pdf'} onClick={() => void download('pdf')}>
        <FileDownIcon aria-hidden="true" />
        PDF yuklab olish
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={!poster || pending !== null}
        aria-busy={pending === 'png'} onClick={() => void download('png')}>
        <DownloadIcon aria-hidden="true" />
        PNG yuklab olish
      </Button>
    </div>
    {failed ? <p role="alert" className="text-sm text-destructive">QR plakatini yuklab bo‘lmadi. Qayta urinib ko‘ring.</p> : null}
  </div>
}
