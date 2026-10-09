import { useTerminalPresentation } from './presentation'
import { LandmarkIcon, MapPinIcon, MonitorIcon, PhoneIcon, QrCodeIcon, StoreIcon } from 'lucide-react'
import { DetailsBody, DetailsDialogShell, DetailsSectionCard, DetailsFieldRow, DetailsStatusBadge, DetailsCopyField, DetailsPrimaryAction } from '@/shared/ui/DetailsDialog'
import { presentQrLink } from '@/features/dynamic-qr/qr-presentation'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { formatUzbekPhoneDisplay } from '@/shared/presentation/phone'

interface TerminalDetailsContentProps {
  readonly row: TerminalRow
  readonly onViewQr: (row: TerminalRow) => void
}

export function TerminalDetailsContent({ row, onViewQr }: TerminalDetailsContentProps) {
  const p = useTerminalPresentation()
  const link = presentQrLink(row.staticQrLink)
  return <DetailsBody>
    <DetailsSectionCard title={p.message('details.main')} icon={MonitorIcon}>
      <DetailsFieldRow label={p.message('fields.terminalId')}>{row.pkey}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.name')}>{row.name}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.status')}><DetailsStatusBadge status={p.status(row.statusCode)} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.terminalType')}>{row.terminalType ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.mcc')}>{row.mccCode ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.createdAt')}>{row.createdAt ? p.wallTime(row.createdAt) : '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.updatedAt')}>{row.updatedAt ? p.wallTime(row.updatedAt) : '—'}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title={p.message('fields.merchant')} icon={StoreIcon}>
      <DetailsFieldRow label={p.message('fields.merchant')}>{row.merchantName}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.merchantId')}>{row.merchantId}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title={p.message('fields.bank')} icon={LandmarkIcon}>
      <DetailsFieldRow label={p.message('fields.bank')}>{row.bankAccountName}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.bankId')}>{row.bankAccountId}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title={p.message('details.location')} icon={MapPinIcon}>
      <DetailsFieldRow label={p.message('fields.region')}>{row.regionName ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.regionId')}>{row.regionId ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.district')}>{row.districtName ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.districtId')}>{row.districtId ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.address')}>{row.address ?? '—'}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title={p.message('details.contact')} icon={PhoneIcon}>
      <DetailsFieldRow label={p.message('fields.phones')}>{row.phones.length > 0
        ? <ul className="space-y-1">{row.phones.map((phone, index) => <li key={index}>{formatUzbekPhoneDisplay(phone)}</li>)}</ul>
        : '—'}</DetailsFieldRow>
    </DetailsSectionCard>
    <DetailsSectionCard title={p.message('details.qr')} icon={QrCodeIcon} footer={link.kind === 'available'
      ? <DetailsPrimaryAction onClick={() => onViewQr(row)}>{p.message('actions.viewQr')}</DetailsPrimaryAction>
      : <p role="status" className="text-sm text-text-secondary">{p.message('display.unavailable')}</p>}>
      <DetailsFieldRow label={p.message('fields.qrId')}>{row.staticQrId ?? '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.qrLink')}>{link.kind === 'available' ? <DetailsCopyField value={link.original} /> : '—'}</DetailsFieldRow>
    </DetailsSectionCard>
  </DetailsBody>
}

export function TerminalDetailsSheet({ row, onOpenChange, onViewQr }: {
  readonly row: TerminalRow | null; readonly onOpenChange: (open: boolean) => void
  readonly onViewQr: (row: TerminalRow) => void
}) {
  const p = useTerminalPresentation()
  if (!row) return null
  return <DetailsDialogShell onOpenChange={onOpenChange} icon={MonitorIcon} title={p.message('details.title')} subtitle={row.pkey}>
    <TerminalDetailsContent row={row} onViewQr={onViewQr} />
  </DetailsDialogShell>
}
