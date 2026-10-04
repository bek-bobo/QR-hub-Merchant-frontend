import { useState, type ReactNode } from 'react'
import { Building2Icon, ClockIcon, CoinsIcon, CopyIcon, FileTextIcon, MonitorIcon, QrCodeIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { statusToneClasses, type StatusTone } from '@/shared/presentation/status-tone'
import { copyExactQrText } from './qr-presentation'

export interface QrDetailsCardProps {
  readonly qrId: string
  readonly terminalName: string
  readonly merchantName?: string
  readonly amountLabel?: string
  readonly statusLabel?: string
  readonly statusTone?: StatusTone
  readonly additionalMetadata?: readonly { readonly label: string; readonly value: string }[]
}

function DetailRow({ label, icon, children }: { readonly label: string; readonly icon: ReactNode; readonly children: ReactNode }) {
  return <div className="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 py-4 sm:grid-cols-[1.25rem_5.5rem_minmax(0,1fr)] md:py-3">
    <span aria-hidden="true" className="text-text-secondary [&>svg]:size-5">{icon}</span>
    <dt className="text-xs font-medium uppercase text-text-secondary">{label}</dt>
    <dd className="col-start-2 min-w-0 break-words font-medium text-text-primary sm:col-start-3">{children}</dd>
  </div>
}

export function QrDetailsCard({ qrId, terminalName, merchantName, amountLabel, statusLabel,
  statusTone = 'neutral', additionalMetadata }: QrDetailsCardProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  async function copyId() {
    const outcome = await copyExactQrText(qrId)
    setCopyStatus(outcome === 'copied' ? 'QR ID nusxalandi.' : 'QR ID nusxalanmadi.')
  }
  return <section aria-label="QR ma’lumotlari" className="min-w-0 rounded-2xl border bg-surface p-4 sm:px-5">
    <h4 className="flex items-center gap-3 border-b pb-4 text-base font-semibold text-text-primary">
      <span className="flex size-10 items-center justify-center rounded-xl bg-status-info-background text-status-info-foreground"><FileTextIcon className="size-5" aria-hidden="true" /></span>
      QR ma’lumotlari
    </h4>
    <dl className="divide-y text-sm">
      <DetailRow label="QR ID" icon={<QrCodeIcon />}>
        <div className="flex min-w-0 items-center gap-2">
          <span title={qrId} className="min-w-0 flex-1 break-all text-xs">{qrId}</span>
          {qrId && qrId !== '—' ? <Button type="button" variant="outline" size="icon" aria-label="QR ID nusxalash" onClick={() => void copyId()}><CopyIcon aria-hidden="true" /></Button> : null}
        </div>
      </DetailRow>
      <DetailRow label="Terminal" icon={<MonitorIcon />}>{terminalName}</DetailRow>
      {merchantName ? <DetailRow label="Merchant" icon={<Building2Icon />}>{merchantName}</DetailRow> : null}
      {additionalMetadata?.map(({ label, value }) => <DetailRow key={label} label={label} icon={<MonitorIcon />}>{value}</DetailRow>)}
      {amountLabel ? <DetailRow label="Summa" icon={<CoinsIcon />}><span className="text-2xl font-semibold tabular-nums">{amountLabel}</span></DetailRow> : null}
      {statusLabel ? <DetailRow label="Status" icon={<ClockIcon />}>
        <Badge variant="outline" className={cn('h-auto gap-2 rounded-xl px-3 py-2 text-sm whitespace-normal', statusToneClasses[statusTone].badge)}>
          <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', statusToneClasses[statusTone].indicator)} />{statusLabel}
        </Badge>
      </DetailRow> : null}
    </dl>
    {copyStatus ? <p role="status" className="mt-2 text-sm text-text-secondary">{copyStatus}</p> : null}
  </section>
}
