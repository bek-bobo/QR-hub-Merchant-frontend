import { MonitorIcon, QrCodeIcon, SmartphoneIcon, StoreIcon } from 'lucide-react'
import { DetailsBody, DetailsDialogShell, DetailsSectionCard, DetailsFieldRow, DetailsStatusBadge, DetailsCopyField, DetailsPrimaryAction } from '@/shared/ui/DetailsDialog'
import { presentQrLink } from '@/features/dynamic-qr/qr-presentation'
import type { P5Row } from '@/shared/contracts/p5-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { presentP5Status } from './page-state'

interface P5DetailsContentProps {
  readonly row: P5Row
  readonly onViewQr: (row: P5Row) => void
}

export function P5DetailsContent({ row, onViewQr }: P5DetailsContentProps) {
  const link = presentQrLink(row.staticQrLink)
  return <DetailsBody>
    <DetailsSectionCard title="Qurilma" icon={SmartphoneIcon}>
      <DetailsFieldRow label="Qurilma ID"><MetadataId value={row.deviceId} className="max-w-none whitespace-normal break-all overflow-visible text-clip" /></DetailsFieldRow>
      <DetailsFieldRow label="Tavsif">{row.description ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label="Qurilma holati"><DetailsStatusBadge status={presentP5Status(row.deviceStatus)} /></DetailsFieldRow>
      <DetailsFieldRow label="Yaratilgan">{formatOffsetlessDateTime(row.createdAt)}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title="Terminal" icon={MonitorIcon}>
      <DetailsFieldRow label="Terminal">{row.terminalName}</DetailsFieldRow>
      <DetailsFieldRow label="Terminal ID"><MetadataId value={row.terminalId} className="max-w-none whitespace-normal break-all overflow-visible text-clip" /></DetailsFieldRow>
      <DetailsFieldRow label="Terminal turi">{row.terminalType}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title="Merchant" icon={StoreIcon}>
      <DetailsFieldRow label="Merchant">{row.merchantName}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title="Statik QR" icon={QrCodeIcon} footer={link.kind === 'available'
      ? <DetailsPrimaryAction onClick={() => onViewQr(row)}>Statik QR ko‘rish</DetailsPrimaryAction>
      : <p role="status" className="text-sm text-text-secondary">Xavfsiz Statik QR havolasi mavjud emas.</p>}>
      <DetailsFieldRow label="Statik QR ID">{row.staticQrId ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label="Statik QR holati"><DetailsStatusBadge status={presentActiveStatus(row.staticQrStatus ?? -1)} /></DetailsFieldRow>
      <DetailsFieldRow label="Statik QR havola">{link.kind === 'available' ? <DetailsCopyField value={link.original} /> : '—'}</DetailsFieldRow>
    </DetailsSectionCard>
  </DetailsBody>
}

export function P5DetailsSheet({ row, onOpenChange, onViewQr }: {
  readonly row: P5Row | null; readonly onOpenChange: (open: boolean) => void
  readonly onViewQr: (row: P5Row) => void
}) {
  if (!row) return null
  return <DetailsDialogShell onOpenChange={onOpenChange} icon={QrCodeIcon} title="P5 qurilma tafsilotlari" subtitle={row.deviceId}>
    <P5DetailsContent row={row} onViewQr={onViewQr} />
  </DetailsDialogShell>
}
