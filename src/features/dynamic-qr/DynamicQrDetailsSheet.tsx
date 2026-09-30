import { useState, type ReactNode } from 'react'
import { CopyIcon, QrCodeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { presentQrStatus } from '@/features/dashboard/presenters'
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

function DetailSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <section className="space-y-3 rounded-xl border bg-surface p-4">
    <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{title}</h3>
    <dl className="grid gap-3">{children}</dl>
  </section>
}

function DetailItem({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return <div className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
    <dt className="text-sm text-text-secondary">{label}</dt>
    <dd className="min-w-0 text-sm font-medium text-text-primary">{children}</dd>
  </div>
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

  return <div className="space-y-4 px-4 pb-6 sm:px-5">
    <DetailSection title="Asosiy ma’lumotlar">
      <DetailItem label="QR ID"><TechnicalId value={row.pkey} /></DetailItem>
      <DetailItem label="Holat">{status.label}</DetailItem>
      <DetailItem label="Summa">{formatMoney(row.amount)}</DetailItem>
      <DetailItem label="Yaratilgan vaqt">{formatOffsetlessDateTime(row.createdAt)}</DetailItem>
      <DetailItem label="Yangilangan vaqt">{row.updatedAt ? formatOffsetlessDateTime(row.updatedAt) : '—'}</DetailItem>
      <DetailItem label="RRN">{presentNullableCell(row.rrn)}</DetailItem>
    </DetailSection>

    <DetailSection title="Terminal">
      <DetailItem label="Terminal nomi">{row.terminalName}</DetailItem>
      <DetailItem label="Terminal ID"><TechnicalId value={row.terminalId} /></DetailItem>
      <DetailItem label="Terminal turi">{presentNullableCell(row.terminalType)}</DetailItem>
    </DetailSection>

    <DetailSection title="Merchant">
      <DetailItem label="Merchant">{row.merchantName}</DetailItem>
      <DetailItem label="Merchant ID"><TechnicalId value={row.merchantId} /></DetailItem>
    </DetailSection>

    <DetailSection title="Bank hisobi">
      <DetailItem label="Bank hisobi">{presentNullableCell(row.bankAccountName)}</DetailItem>
      <DetailItem label="Bank hisobi ID"><TechnicalId value={row.bankAccountId} /></DetailItem>
    </DetailSection>

    <DetailSection title="To‘lov / valyuta ma’lumotlari">
      <DetailItem label="Asosiy summa">{formatMoney(row.amount)}</DetailItem>
      <DetailItem label="Valyutadagi summa">{rawValue(row.currencyAmount)}</DetailItem>
      <DetailItem label="Valyuta">{presentNullableCell(row.currencyCode)}</DetailItem>
      <DetailItem label="Kurs">{rawValue(row.rate)}</DetailItem>
      <DetailItem label="Xizmat haqi">{rawValue(row.serviceFeeAmount)}</DetailItem>
    </DetailSection>

    <DetailSection title="Texnik holat">
      <DetailItem label="Status code">
        <span>{row.statusCode}</span>
        <span className="ml-2 font-normal text-text-secondary">{status.label}</span>
      </DetailItem>
      <DetailItem label="Distribution status">{rawValue(row.distributionStatus)}</DetailItem>
    </DetailSection>

    <DetailSection title="QR / link">
      {link.kind === 'available' ? <>
        <DetailItem label="Kanonik havola">
          <span className="block break-all font-normal leading-6 [overflow-wrap:anywhere]">{link.original}</span>
        </DetailItem>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
            <CopyIcon aria-hidden="true" />
            Havolani nusxalash
          </Button>
          <Button type="button" size="sm" onClick={() => onViewQr(row)}>
            <QrCodeIcon aria-hidden="true" />
            QR ko‘rish
          </Button>
        </div>
        {copyStatus ? <p role="status" className="text-sm text-text-secondary">{copyStatus}</p> : null}
      </> : <p className="text-sm text-text-secondary">Havola mavjud emas</p>}
    </DetailSection>
  </div>
}

export function DynamicQrDetailsSheet({ row, onOpenChange, onViewQr }: DynamicQrDetailsSheetProps) {
  if (!row) return null
  return <Sheet open onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full max-w-full overflow-y-auto sm:max-w-lg">
      <SheetHeader className="border-b pr-14">
        <SheetTitle className="text-lg">Dinamik QR tafsilotlari</SheetTitle>
        <SheetDescription className="break-all">{row.pkey}</SheetDescription>
      </SheetHeader>
      <DynamicQrDetailsContent row={row} onViewQr={onViewQr} />
    </SheetContent>
  </Sheet>
}
