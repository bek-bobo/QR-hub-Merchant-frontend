import { CoinsIcon, FileTextIcon, LandmarkIcon, LinkIcon, MonitorIcon, QrCodeIcon, StoreIcon } from 'lucide-react'
import { DetailsBody, DetailsDialogShell, DetailsSectionCard, DetailsFieldRow, DetailsStatusBadge, DetailsCopyField, DetailsPrimaryAction } from '@/shared/ui/DetailsDialog'
import { useState } from 'react'
import { presentQrStatus } from '@/shared/presentation/qr-status'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { presentNullableCell } from './page-state'
import { copyExactPresentedLink, presentDynamicQrRowLink } from './qr-presentation'

interface DynamicQrDetailsSheetProps {
  readonly row: DynamicQrRow | null
  readonly onOpenChange: (open: boolean) => void
  readonly onViewQr: (row: DynamicQrRow) => void
}

interface DynamicQrDetailsContentProps {
  readonly row: DynamicQrRow
  readonly onViewQr: (row: DynamicQrRow) => void
}

function TechnicalId({ value }: { readonly value: string | null }) {
  return value ? <MetadataId value={value} className="max-w-none whitespace-normal break-all overflow-visible text-clip" /> : '—'
}

function rawValue(value: number | null): string {
  return value === null ? '—' : String(value)
}

export function DynamicQrDetailsContent({ row, onViewQr }: DynamicQrDetailsContentProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const link = presentDynamicQrRowLink(row)
  const status = presentQrStatus(row.statusCode)

  async function copyLink() {
    const outcome = await copyExactPresentedLink(link, async (text) => {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
    })
    setCopyStatus(outcome === 'copied' ? 'Havola nusxalandi.' : 'Havolani nusxalab bo‘lmadi.')
  }

  return <DetailsBody>
    <DetailsSectionCard title="Asosiy ma’lumotlar" icon={QrCodeIcon}>
      <DetailsFieldRow label="QR ID"><TechnicalId value={row.pkey} /></DetailsFieldRow>
      <DetailsFieldRow label="Holat"><DetailsStatusBadge status={status} /></DetailsFieldRow>
      <DetailsFieldRow label="Summa">{formatMoney(row.amount)}</DetailsFieldRow>
      <DetailsFieldRow label="Yaratilgan vaqt">{formatOffsetlessDateTime(row.createdAt)}</DetailsFieldRow>
      <DetailsFieldRow label="Yangilangan vaqt">{row.updatedAt ? formatOffsetlessDateTime(row.updatedAt) : '—'}</DetailsFieldRow>
      <DetailsFieldRow label="RRN">{presentNullableCell(row.rrn)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="Terminal" icon={MonitorIcon}>
      <DetailsFieldRow label="Terminal nomi">{row.terminalName}</DetailsFieldRow>
      <DetailsFieldRow label="Terminal ID"><TechnicalId value={row.terminalId} /></DetailsFieldRow>
      <DetailsFieldRow label="Terminal turi">{presentNullableCell(row.terminalType)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="Merchant" icon={StoreIcon}>
      <DetailsFieldRow label="Merchant">{row.merchantName}</DetailsFieldRow>
      <DetailsFieldRow label="Merchant ID"><TechnicalId value={row.merchantId} /></DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="Bank hisobi" icon={LandmarkIcon}>
      <DetailsFieldRow label="Bank hisobi">{presentNullableCell(row.bankAccountName)}</DetailsFieldRow>
      <DetailsFieldRow label="Bank hisobi ID"><TechnicalId value={row.bankAccountId} /></DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="To‘lov / valyuta ma’lumotlari" icon={CoinsIcon}>
      <DetailsFieldRow label="Asosiy summa">{formatMoney(row.amount)}</DetailsFieldRow>
      <DetailsFieldRow label="Valyutadagi summa">{rawValue(row.currencyAmount)}</DetailsFieldRow>
      <DetailsFieldRow label="Valyuta">{presentNullableCell(row.currencyCode)}</DetailsFieldRow>
      <DetailsFieldRow label="Kurs">{rawValue(row.rate)}</DetailsFieldRow>
      <DetailsFieldRow label="Xizmat haqi">{rawValue(row.serviceFeeAmount)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="Texnik holat" icon={FileTextIcon}>
      <DetailsFieldRow label="Status code">
        <span>{row.statusCode}</span>
        <span className="ml-2 font-normal text-text-secondary">{status.label}</span>
      </DetailsFieldRow>
      <DetailsFieldRow label="Distribution status">{rawValue(row.distributionStatus)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title="QR / link" icon={LinkIcon} footer={link.kind === 'available' ? <>
      <DetailsPrimaryAction onClick={() => onViewQr(row)}>QR ko‘rish</DetailsPrimaryAction>
      {copyStatus ? <p role="status" className="text-sm text-text-secondary">{copyStatus}</p> : null}
    </> : null}>
      {link.kind === 'available' ? <>
        <DetailsFieldRow label="Kanonik havola">
          <DetailsCopyField value={link.original} onCopy={() => void copyLink()} />
        </DetailsFieldRow>
      </> : <DetailsFieldRow label="Kanonik havola"><span className="font-normal text-text-secondary">Havola mavjud emas</span></DetailsFieldRow>}
    </DetailsSectionCard>
  </DetailsBody>
}

export function DynamicQrDetailsSheet({ row, onOpenChange, onViewQr }: DynamicQrDetailsSheetProps) {
  if (!row) return null
  return <DetailsDialogShell onOpenChange={onOpenChange} icon={QrCodeIcon} title="Dinamik QR tafsilotlari" subtitle={row.pkey}>
    <DynamicQrDetailsContent row={row} onViewQr={onViewQr} />
  </DetailsDialogShell>
}
