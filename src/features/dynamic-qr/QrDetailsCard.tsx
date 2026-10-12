import { useDynamicQrPresentation } from './presentation'
import { useState } from 'react'
import type { StatusTone } from '@/shared/presentation/status-tone'
import { QrCodeIcon } from 'lucide-react'
import { DetailsSectionCard, DetailsFieldRow, DetailsCopyField, DetailsStatusBadge } from '@/shared/ui/DetailsDialog'
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

export function QrDetailsCard({ qrId, terminalName, merchantName, amountLabel, statusLabel,
  statusTone = 'neutral', additionalMetadata }: QrDetailsCardProps) {
  const p = useDynamicQrPresentation()
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed' | null>(null)
  async function copyId() {
    const outcome = await copyExactQrText(qrId)
    setCopyStatus(outcome === 'copied' ? 'copied' : 'failed')
  }
  return <DetailsSectionCard title={p.message('display.metadata')} icon={QrCodeIcon} footer={copyStatus ? <p role="status" className="text-sm text-text-secondary">{p.message(copyStatus === 'copied' ? 'feedback.idCopied' : 'feedback.idFailed')}</p> : null}>
    <DetailsFieldRow label={p.message('table.qrId')}>
      <DetailsCopyField value={qrId} onCopy={() => void copyId()} copyLabel={p.message('feedback.copyId')} copyable={!!qrId && qrId !== '—'} />
    </DetailsFieldRow>
    <DetailsFieldRow label={p.message('table.terminal')}>{terminalName}</DetailsFieldRow>
    {merchantName ? <DetailsFieldRow label={p.message('table.merchant')}>{merchantName}</DetailsFieldRow> : null}
    {additionalMetadata?.map(({ label, value }) => <DetailsFieldRow key={label} label={label}>{value}</DetailsFieldRow>)}
    {amountLabel ? <DetailsFieldRow label={p.message('table.amount')}><span className="text-2xl font-semibold tabular-nums">{amountLabel}</span></DetailsFieldRow> : null}
    {statusLabel ? <DetailsFieldRow label={p.message('table.status')}><DetailsStatusBadge status={{ label: statusLabel, tone: statusTone }} /></DetailsFieldRow> : null}
  </DetailsSectionCard>
}
