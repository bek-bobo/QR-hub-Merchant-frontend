import { useP5Presentation } from './presentation'
import { MonitorIcon, QrCodeIcon, SmartphoneIcon, StoreIcon } from 'lucide-react'
import { DetailsBody, DetailsDialogShell, DetailsSectionCard, DetailsFieldRow, DetailsStatusBadge, DetailsCopyField, DetailsPrimaryAction } from '@/shared/ui/DetailsDialog'
import { presentQrLink } from '@/features/dynamic-qr/qr-presentation'
import type { P5Row } from '@/shared/contracts/p5-read'
import { MetadataId } from '@/shared/presentation/MetadataId'

interface P5DetailsContentProps {
  readonly row: P5Row
  readonly onViewQr: (row: P5Row) => void
}

export function P5DetailsContent({ row, onViewQr }: P5DetailsContentProps) {
  const p = useP5Presentation()
  const link = presentQrLink(row.staticQrLink)
  return <DetailsBody>
    <DetailsSectionCard title={p.message('details.device')} icon={SmartphoneIcon}>
      <DetailsFieldRow label={p.message('fields.deviceId')}><MetadataId value={row.deviceId} className="max-w-none whitespace-normal break-all overflow-visible text-clip" /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.description')}>{row.description ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.status')}><DetailsStatusBadge status={p.status(row.deviceStatus)} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.created')}>{p.wallTime(row.createdAt)}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title={p.message('fields.terminal')} icon={MonitorIcon}>
      <DetailsFieldRow label={p.message('fields.terminal')}>{row.terminalName}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.terminalId')}><MetadataId value={row.terminalId} className="max-w-none whitespace-normal break-all overflow-visible text-clip" /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.terminalType')}>{row.terminalType}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title={p.message('fields.merchant')} icon={StoreIcon}>
      <DetailsFieldRow label={p.message('fields.merchant')}>{row.merchantName}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title={p.message('details.qr')} icon={QrCodeIcon} footer={link.kind === 'available'
      ? <DetailsPrimaryAction onClick={() => onViewQr(row)}>{p.message('actions.viewQr')}</DetailsPrimaryAction>
      : <p role="status" className="text-sm text-text-secondary">{p.message('display.unavailable')}</p>}>
      <DetailsFieldRow label={p.message('fields.qrId')}>{row.staticQrId ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.qrStatus')}><DetailsStatusBadge status={p.qrStatus(row.staticQrStatus ?? -1)} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.qrLink')}>{link.kind === 'available' ? <DetailsCopyField value={link.original} /> : '—'}</DetailsFieldRow>
    </DetailsSectionCard>
  </DetailsBody>
}

export function P5DetailsSheet({ row, onOpenChange, onViewQr }: {
  readonly row: P5Row | null; readonly onOpenChange: (open: boolean) => void
  readonly onViewQr: (row: P5Row) => void
}) {
  const p = useP5Presentation()
  if (!row) return null
  return <DetailsDialogShell onOpenChange={onOpenChange} icon={QrCodeIcon} title={p.message('details.title')} subtitle={row.deviceId}>
    <P5DetailsContent row={row} onViewQr={onViewQr} />
  </DetailsDialogShell>
}
