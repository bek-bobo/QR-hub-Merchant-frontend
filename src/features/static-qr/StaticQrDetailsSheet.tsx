import { CoinsIcon, FileTextIcon, LinkIcon, MapPinIcon, MonitorIcon, QrCodeIcon, StoreIcon } from 'lucide-react'
import { DetailsBody, DetailsDialogShell, DetailsSectionCard, DetailsFieldRow, DetailsStatusBadge, DetailsCopyField, DetailsPrimaryAction } from '@/shared/ui/DetailsDialog'
import { presentQrLink } from '@/features/dynamic-qr/qr-presentation'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { MetadataId } from '@/shared/presentation/MetadataId'
import type { StaticQrAmountValue, StaticQrRow } from './contract'

interface StaticQrDetailsSheetProps {
  readonly row: StaticQrRow | null
  readonly onOpenChange: (open: boolean) => void
  readonly onViewQr: (row: StaticQrRow) => void
}

interface StaticQrDetailsContentProps {
  readonly row: StaticQrRow
  readonly onViewQr: (row: StaticQrRow) => void
}

function TechnicalId({ value }: { readonly value: string | null }) {
  return value ? <MetadataId value={value} className="max-w-none whitespace-normal break-all overflow-visible text-clip" /> : '—'
}

function textValue(value: string | null): string {
  return value ?? '—'
}

function amountValue(value: StaticQrAmountValue | null): string {
  return value === null ? '—' : String(value)
}

function dateValue(value: string | null): string {
  return value ? formatOffsetlessDateTime(value) : '—'
}

function UrlValue({ value, copyable = false }: { readonly value: string | null; readonly copyable?: boolean }) {
  return value ? <DetailsCopyField value={value} copyable={copyable} /> : '—'
}

export function StaticQrDetailsContent({ row, onViewQr }: StaticQrDetailsContentProps) {
  const status = presentActiveStatus(row.statusCode)
  const qrLink = presentQrLink(row.link)

  return <DetailsBody>
    <DetailsSectionCard title="Asosiy ma’lumotlar" icon={QrCodeIcon}>
      <DetailsFieldRow label="QR ID"><TechnicalId value={row.id} /></DetailsFieldRow>
      <DetailsFieldRow label="Holat"><DetailsStatusBadge status={status} /></DetailsFieldRow>
      <DetailsFieldRow label="Yaratilgan vaqt">{dateValue(row.createdAt)}</DetailsFieldRow>
      <DetailsFieldRow label="Yangilangan vaqt">{dateValue(row.updatedAt)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="Terminal" icon={MonitorIcon}>
      <DetailsFieldRow label="Terminal nomi">{row.terminalName}</DetailsFieldRow>
      <DetailsFieldRow label="Terminal ID"><TechnicalId value={row.terminalId} /></DetailsFieldRow>
      <DetailsFieldRow label="Terminal turi">{textValue(row.terminalType)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="Merchant" icon={StoreIcon}>
      <DetailsFieldRow label="Merchant">{row.merchantName}</DetailsFieldRow>
      <DetailsFieldRow label="Merchant ID"><TechnicalId value={row.merchantId} /></DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="Summa chegaralari" icon={CoinsIcon}>
      <DetailsFieldRow label="Minimum summa">{amountValue(row.minAmount)}</DetailsFieldRow>
      <DetailsFieldRow label="Maksimum summa">{amountValue(row.maxAmount)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="Hudud" icon={MapPinIcon}>
      <DetailsFieldRow label="Viloyat">{textValue(row.regionName)}</DetailsFieldRow>
      <DetailsFieldRow label="Viloyat ID"><TechnicalId value={row.regionId} /></DetailsFieldRow>
      <DetailsFieldRow label="Tuman">{textValue(row.districtName)}</DetailsFieldRow>
      <DetailsFieldRow label="Tuman ID"><TechnicalId value={row.districtId} /></DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="Linklar" icon={LinkIcon} footer={qrLink.kind === 'available'
      ? <DetailsPrimaryAction onClick={() => onViewQr(row)}>QR ko‘rish</DetailsPrimaryAction> : null}>
      <DetailsFieldRow label="QR havola"><UrlValue value={row.link} copyable={qrLink.kind === 'available'} /></DetailsFieldRow>
      <DetailsFieldRow label="Redirect URL"><UrlValue value={row.redirectUrl} /></DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="Texnik ma’lumotlar" icon={FileTextIcon}>
      <DetailsFieldRow label="Status code">
        <span>{row.statusCode}</span>
        <span className="ml-2 font-normal text-text-secondary">{status.label}</span>
      </DetailsFieldRow>
    </DetailsSectionCard>
  </DetailsBody>
}

export function StaticQrDetailsSheet({ row, onOpenChange, onViewQr }: StaticQrDetailsSheetProps) {
  if (!row) return null
  return <DetailsDialogShell onOpenChange={onOpenChange} icon={QrCodeIcon} title="Statik QR tafsilotlari" subtitle={row.id}>
    <StaticQrDetailsContent row={row} onViewQr={onViewQr} />
  </DetailsDialogShell>
}
