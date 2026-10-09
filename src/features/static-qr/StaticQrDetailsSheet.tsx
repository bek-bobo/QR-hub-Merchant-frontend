import type { StaticQrPresentation } from './presentation'
import { useStaticQrPresentation } from './presentation'
import { CoinsIcon, FileTextIcon, LinkIcon, MapPinIcon, MonitorIcon, QrCodeIcon, StoreIcon } from 'lucide-react'
import { DetailsBody, DetailsDialogShell, DetailsSectionCard, DetailsFieldRow, DetailsStatusBadge, DetailsCopyField, DetailsPrimaryAction } from '@/shared/ui/DetailsDialog'
import { presentQrLink } from '@/features/dynamic-qr/qr-presentation'
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

function dateValue(value: string | null, p: StaticQrPresentation): string {
  return value ? p.wallTime(value) : '—'
}

function UrlValue({ value, copyable = false }: { readonly value: string | null; readonly copyable?: boolean }) {
  return value ? <DetailsCopyField value={value} copyable={copyable} /> : '—'
}

export function StaticQrDetailsContent({ row, onViewQr }: StaticQrDetailsContentProps) {
  const p = useStaticQrPresentation()
  const status = p.status(row.statusCode)
  const qrLink = presentQrLink(row.link)

  return <DetailsBody>
    <DetailsSectionCard title={p.message('details.main')} icon={QrCodeIcon}>
      <DetailsFieldRow label={p.message('fields.qrId')}><TechnicalId value={row.id} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.status')}><DetailsStatusBadge status={status} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.createdAt')}>{dateValue(row.createdAt, p)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.updatedAt')}>{dateValue(row.updatedAt, p)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('fields.terminal')} icon={MonitorIcon}>
      <DetailsFieldRow label={p.message('fields.terminalName')}>{row.terminalName}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.terminalId')}><TechnicalId value={row.terminalId} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.terminalType')}>{textValue(row.terminalType)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('fields.merchant')} icon={StoreIcon}>
      <DetailsFieldRow label={p.message('fields.merchant')}>{row.merchantName}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.merchantId')}><TechnicalId value={row.merchantId} /></DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('details.bounds')} icon={CoinsIcon}>
      <DetailsFieldRow label={p.message('fields.minimum')}>{amountValue(row.minAmount)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.maximum')}>{amountValue(row.maxAmount)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('details.region')} icon={MapPinIcon}>
      <DetailsFieldRow label={p.message('fields.region')}>{textValue(row.regionName)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.regionId')}><TechnicalId value={row.regionId} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.district')}>{textValue(row.districtName)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.districtId')}><TechnicalId value={row.districtId} /></DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('details.links')} icon={LinkIcon} footer={qrLink.kind === 'available'
      ? <DetailsPrimaryAction onClick={() => onViewQr(row)}>{p.message('actions.viewQr')}</DetailsPrimaryAction> : null}>
      <DetailsFieldRow label={p.message('fields.link')}><UrlValue value={row.link} copyable={qrLink.kind === 'available'} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('fields.redirect')}><UrlValue value={row.redirectUrl} /></DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('details.technical')} icon={FileTextIcon}>
      <DetailsFieldRow label={p.message('fields.statusCode')}>
        <span>{row.statusCode}</span>
        <span className="ml-2 font-normal text-text-secondary">{status.label}</span>
      </DetailsFieldRow>
    </DetailsSectionCard>
  </DetailsBody>
}

export function StaticQrDetailsSheet({ row, onOpenChange, onViewQr }: StaticQrDetailsSheetProps) {
  const p = useStaticQrPresentation()
  if (!row) return null
  return <DetailsDialogShell onOpenChange={onOpenChange} icon={QrCodeIcon} title={p.message('details.title')} subtitle={row.id}>
    <StaticQrDetailsContent row={row} onViewQr={onViewQr} />
  </DetailsDialogShell>
}
