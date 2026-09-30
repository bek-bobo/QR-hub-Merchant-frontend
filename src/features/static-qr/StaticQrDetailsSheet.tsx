import type { ReactNode } from 'react'
import { QrCodeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

function textValue(value: string | null): string {
  return value ?? '—'
}

function amountValue(value: StaticQrAmountValue | null): string {
  return value === null ? '—' : String(value)
}

function dateValue(value: string | null): string {
  return value ? formatOffsetlessDateTime(value) : '—'
}

function UrlValue({ value }: { readonly value: string | null }) {
  return value ? <span className="block break-all font-normal leading-6 [overflow-wrap:anywhere]">{value}</span> : '—'
}

export function StaticQrDetailsContent({ row, onViewQr }: StaticQrDetailsContentProps) {
  const status = presentActiveStatus(row.statusCode)
  const qrLink = presentQrLink(row.link)

  return <div className="space-y-4 px-4 pb-6 sm:px-5">
    <DetailSection title="Asosiy ma’lumotlar">
      <DetailItem label="QR ID"><TechnicalId value={row.id} /></DetailItem>
      <DetailItem label="Holat">{status.label}</DetailItem>
      <DetailItem label="Yaratilgan vaqt">{dateValue(row.createdAt)}</DetailItem>
      <DetailItem label="Yangilangan vaqt">{dateValue(row.updatedAt)}</DetailItem>
    </DetailSection>

    <DetailSection title="Terminal">
      <DetailItem label="Terminal nomi">{row.terminalName}</DetailItem>
      <DetailItem label="Terminal ID"><TechnicalId value={row.terminalId} /></DetailItem>
      <DetailItem label="Terminal turi">{textValue(row.terminalType)}</DetailItem>
    </DetailSection>

    <DetailSection title="Merchant">
      <DetailItem label="Merchant">{row.merchantName}</DetailItem>
      <DetailItem label="Merchant ID"><TechnicalId value={row.merchantId} /></DetailItem>
    </DetailSection>

    <DetailSection title="Summa chegaralari">
      <DetailItem label="Minimum summa">{amountValue(row.minAmount)}</DetailItem>
      <DetailItem label="Maksimum summa">{amountValue(row.maxAmount)}</DetailItem>
    </DetailSection>

    <DetailSection title="Hudud">
      <DetailItem label="Viloyat">{textValue(row.regionName)}</DetailItem>
      <DetailItem label="Viloyat ID"><TechnicalId value={row.regionId} /></DetailItem>
      <DetailItem label="Tuman">{textValue(row.districtName)}</DetailItem>
      <DetailItem label="Tuman ID"><TechnicalId value={row.districtId} /></DetailItem>
    </DetailSection>

    <DetailSection title="Linklar">
      <DetailItem label="QR havola"><UrlValue value={row.link} /></DetailItem>
      <DetailItem label="Redirect URL"><UrlValue value={row.redirectUrl} /></DetailItem>
      {qrLink.kind === 'available' ? <div className="flex justify-end pt-1">
        <Button type="button" size="sm" onClick={() => onViewQr(row)}>
          <QrCodeIcon aria-hidden="true" />
          QR ko‘rish
        </Button>
      </div> : null}
    </DetailSection>

    <DetailSection title="Texnik ma’lumotlar">
      <DetailItem label="Status code">
        <span>{row.statusCode}</span>
        <span className="ml-2 font-normal text-text-secondary">{status.label}</span>
      </DetailItem>
    </DetailSection>
  </div>
}

export function StaticQrDetailsSheet({ row, onOpenChange, onViewQr }: StaticQrDetailsSheetProps) {
  if (!row) return null
  return <Sheet open onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full max-w-full overflow-y-auto sm:max-w-lg">
      <SheetHeader className="border-b pr-14">
        <SheetTitle className="text-lg">Statik QR tafsilotlari</SheetTitle>
        <SheetDescription className="break-all">{row.id}</SheetDescription>
      </SheetHeader>
      <StaticQrDetailsContent row={row} onViewQr={onViewQr} />
    </SheetContent>
  </Sheet>
}
