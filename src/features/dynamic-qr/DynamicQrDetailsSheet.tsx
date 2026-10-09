import { useDynamicQrPresentation } from './presentation'
import { CoinsIcon, FileTextIcon, LandmarkIcon, LinkIcon, MonitorIcon, QrCodeIcon, StoreIcon } from 'lucide-react'
import { DetailsBody, DetailsDialogShell, DetailsSectionCard, DetailsFieldRow, DetailsStatusBadge, DetailsCopyField, DetailsPrimaryAction } from '@/shared/ui/DetailsDialog'
import { useState } from 'react'
import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { formatMoney } from '@/shared/money/minor'
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
  const p = useDynamicQrPresentation()
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed' | null>(null)
  const link = presentDynamicQrRowLink(row)
  const status = p.status(row.statusCode)

  async function copyLink() {
    const outcome = await copyExactPresentedLink(link, async (text) => {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
    })
    setCopyStatus(outcome === 'copied' ? 'copied' : 'failed')
  }

  return <DetailsBody>
    <DetailsSectionCard title={p.message('details.main')} icon={QrCodeIcon}>
      <DetailsFieldRow label={p.message('table.qrId')}><TechnicalId value={row.pkey} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('table.state')}><DetailsStatusBadge status={status} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('table.amount')}>{formatMoney(row.amount)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('table.createdAt')}>{p.wallTime(row.createdAt)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('table.updatedAt')}>{row.updatedAt ? p.wallTime(row.updatedAt) : '—'}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('table.rrn')}>{presentNullableCell(row.rrn)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('table.terminal')} icon={MonitorIcon}>
      <DetailsFieldRow label={p.message('details.terminalName')}>{row.terminalName}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('details.terminalId')}><TechnicalId value={row.terminalId} /></DetailsFieldRow>
      <DetailsFieldRow label={p.message('details.terminalType')}>{presentNullableCell(row.terminalType)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('table.merchant')} icon={StoreIcon}>
      <DetailsFieldRow label={p.message('table.merchant')}>{row.merchantName}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('details.merchantId')}><TechnicalId value={row.merchantId} /></DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('table.bank')} icon={LandmarkIcon}>
      <DetailsFieldRow label={p.message('table.bank')}>{presentNullableCell(row.bankAccountName)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('details.bankId')}><TechnicalId value={row.bankAccountId} /></DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('details.payment')} icon={CoinsIcon}>
      <DetailsFieldRow label={p.message('details.baseAmount')}>{formatMoney(row.amount)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('details.currencyAmount')}>{rawValue(row.currencyAmount)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('details.currency')}>{presentNullableCell(row.currencyCode)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('details.rate')}>{rawValue(row.rate)}</DetailsFieldRow>
      <DetailsFieldRow label={p.message('stats.fee')}>{rawValue(row.serviceFeeAmount)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('details.technical')} icon={FileTextIcon}>
      <DetailsFieldRow label={p.message('details.statusCode')}>
        <span>{row.statusCode}</span>
        <span className="ml-2 font-normal text-text-secondary">{status.label}</span>
      </DetailsFieldRow>
      <DetailsFieldRow label={p.message('details.distributionCode')}>{rawValue(row.distributionStatus)}</DetailsFieldRow>
    </DetailsSectionCard>

    <DetailsSectionCard title={p.message('details.linkSection')} icon={LinkIcon} footer={link.kind === 'available' ? <>
      <DetailsPrimaryAction onClick={() => onViewQr(row)}>{p.message('actions.viewQr')}</DetailsPrimaryAction>
      {copyStatus ? <p role="status" className="text-sm text-text-secondary">{p.message(copyStatus === 'copied' ? 'feedback.linkCopied' : 'feedback.linkFailed')}</p> : null}
    </> : null}>
      {link.kind === 'available' ? <>
        <DetailsFieldRow label={p.message('display.canonical')}>
          <DetailsCopyField value={link.original} onCopy={() => void copyLink()} />
        </DetailsFieldRow>
      </> : <DetailsFieldRow label={p.message('display.canonical')}><span className="font-normal text-text-secondary">{p.message('details.noLink')}</span></DetailsFieldRow>}
    </DetailsSectionCard>
  </DetailsBody>
}

export function DynamicQrDetailsSheet({ row, onOpenChange, onViewQr }: DynamicQrDetailsSheetProps) {
  const p = useDynamicQrPresentation()
  if (!row) return null
  return <DetailsDialogShell onOpenChange={onOpenChange} icon={QrCodeIcon} title={p.message('details.title')} subtitle={row.pkey}>
    <DynamicQrDetailsContent row={row} onViewQr={onViewQr} />
  </DetailsDialogShell>
}
