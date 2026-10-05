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
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  async function copyId() {
    const outcome = await copyExactQrText(qrId)
    setCopyStatus(outcome === 'copied' ? 'QR ID nusxalandi.' : 'QR ID nusxalanmadi.')
  }
  return <DetailsSectionCard title="QR ma’lumotlari" icon={QrCodeIcon} footer={copyStatus ? <p role="status" className="text-sm text-text-secondary">{copyStatus}</p> : null}>
    <DetailsFieldRow label="QR ID">
      <DetailsCopyField value={qrId} onCopy={() => void copyId()} copyLabel="QR ID nusxalash" copyable={!!qrId && qrId !== '—'} />
    </DetailsFieldRow>
    <DetailsFieldRow label="Terminal">{terminalName}</DetailsFieldRow>
    {merchantName ? <DetailsFieldRow label="Merchant">{merchantName}</DetailsFieldRow> : null}
    {additionalMetadata?.map(({ label, value }) => <DetailsFieldRow key={label} label={label}>{value}</DetailsFieldRow>)}
    {amountLabel ? <DetailsFieldRow label="Summa"><span className="text-2xl font-semibold tabular-nums">{amountLabel}</span></DetailsFieldRow> : null}
    {statusLabel ? <DetailsFieldRow label="Status"><DetailsStatusBadge status={{ label: statusLabel, tone: statusTone }} /></DetailsFieldRow> : null}
  </DetailsSectionCard>
}
