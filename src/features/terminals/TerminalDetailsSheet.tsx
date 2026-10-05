import { LandmarkIcon, MapPinIcon, MonitorIcon, PhoneIcon, QrCodeIcon, StoreIcon } from 'lucide-react'
import { DetailsBody, DetailsDialogShell, DetailsSectionCard, DetailsFieldRow, DetailsStatusBadge, DetailsCopyField, DetailsPrimaryAction } from '@/shared/ui/DetailsDialog'
import { presentQrLink } from '@/features/dynamic-qr/qr-presentation'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { formatUzbekPhoneDisplay } from '@/shared/presentation/phone'

interface TerminalDetailsContentProps {
  readonly row: TerminalRow
  readonly onViewQr: (row: TerminalRow) => void
}

export function TerminalDetailsContent({ row, onViewQr }: TerminalDetailsContentProps) {
  const link = presentQrLink(row.staticQrLink)
  return <DetailsBody>
    <DetailsSectionCard title="Asosiy" icon={MonitorIcon}>
      <DetailsFieldRow label="Terminal ID">{row.pkey}</DetailsFieldRow>
      <DetailsFieldRow label="Nomi">{row.name}</DetailsFieldRow>
      <DetailsFieldRow label="Holat"><DetailsStatusBadge status={presentActiveStatus(row.statusCode)} /></DetailsFieldRow>
      <DetailsFieldRow label="Terminal turi">{row.terminalType ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label="MCC">{row.mccCode ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label="Yaratilgan">{row.createdAt ? formatOffsetlessDateTime(row.createdAt) : '—'}</DetailsFieldRow>
      <DetailsFieldRow label="Yangilangan">{row.updatedAt ? formatOffsetlessDateTime(row.updatedAt) : '—'}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title="Merchant" icon={StoreIcon}>
      <DetailsFieldRow label="Merchant">{row.merchantName}</DetailsFieldRow>
      <DetailsFieldRow label="Merchant ID">{row.merchantId}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title="Bank hisobi" icon={LandmarkIcon}>
      <DetailsFieldRow label="Bank hisobi">{row.bankAccountName}</DetailsFieldRow>
      <DetailsFieldRow label="Bank hisobi ID">{row.bankAccountId}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title="Joylashuv" icon={MapPinIcon}>
      <DetailsFieldRow label="Viloyat">{row.regionName ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label="Viloyat ID">{row.regionId ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label="Tuman">{row.districtName ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label="Tuman ID">{row.districtId ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label="Manzil">{row.address ?? '—'}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title="Aloqa" icon={PhoneIcon}>
      <DetailsFieldRow label="Telefonlar">{row.phones.length > 0
        ? <ul className="space-y-1">{row.phones.map((phone, index) => <li key={index}>{formatUzbekPhoneDisplay(phone)}</li>)}</ul>
        : '—'}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title="Statik QR" icon={QrCodeIcon} footer={link.kind === 'available'
      ? <DetailsPrimaryAction onClick={() => onViewQr(row)}>Statik QR ko‘rish</DetailsPrimaryAction>
      : <p role="status" className="text-sm text-text-secondary">Xavfsiz Statik QR havolasi mavjud emas.</p>}>
      <DetailsFieldRow label="Statik QR ID">{row.staticQrId ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label="Statik QR havola">{link.kind === 'available' ? <DetailsCopyField value={link.original} /> : '—'}</DetailsFieldRow>
    </DetailsSectionCard>
  </DetailsBody>
}

export function TerminalDetailsSheet({ row, onOpenChange, onViewQr }: {
  readonly row: TerminalRow | null; readonly onOpenChange: (open: boolean) => void
  readonly onViewQr: (row: TerminalRow) => void
}) {
  if (!row) return null
  return <DetailsDialogShell onOpenChange={onOpenChange} icon={MonitorIcon} title="Terminal tafsilotlari" subtitle={row.pkey}>
    <TerminalDetailsContent row={row} onViewQr={onViewQr} />
  </DetailsDialogShell>
}
