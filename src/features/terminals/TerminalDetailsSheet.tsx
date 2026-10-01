import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { presentQrLink } from '@/features/dynamic-qr/qr-presentation'
import type { TerminalRow } from '@/shared/contracts/management-read'
import { presentActiveStatus } from '@/shared/presentation/active-status'
import { formatOffsetlessDateTime } from '@/shared/presentation/date-time'
import { formatUzbekPhoneDisplay } from '@/shared/presentation/phone'

interface TerminalDetailsContentProps {
  readonly row: TerminalRow
  readonly onViewQr: (row: TerminalRow) => void
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <section className="space-y-3 rounded-xl border bg-surface p-4">
    <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{title}</h3>
    <dl className="grid gap-3">{children}</dl>
  </section>
}

function Detail({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return <div className="grid min-w-0 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
    <dt className="text-sm text-text-secondary">{label}</dt>
    <dd className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium text-text-primary [overflow-wrap:anywhere]">{children}</dd>
  </div>
}

export function TerminalDetailsContent({ row, onViewQr }: TerminalDetailsContentProps) {
  const link = presentQrLink(row.staticQrLink)
  return <div className="min-w-0 space-y-4 px-4 pb-6 sm:px-5">
    <Section title="Asosiy">
      <Detail label="Terminal ID">{row.pkey}</Detail>
      <Detail label="Nomi">{row.name}</Detail>
      <Detail label="Holat">{presentActiveStatus(row.statusCode).label}</Detail>
      <Detail label="Terminal turi">{row.terminalType ?? '—'}</Detail>
      <Detail label="MCC">{row.mccCode ?? '—'}</Detail>
      <Detail label="Yaratilgan">{row.createdAt ? formatOffsetlessDateTime(row.createdAt) : '—'}</Detail>
      <Detail label="Yangilangan">{row.updatedAt ? formatOffsetlessDateTime(row.updatedAt) : '—'}</Detail>
    </Section>
    <Section title="Merchant">
      <Detail label="Merchant">{row.merchantName}</Detail>
      <Detail label="Merchant ID">{row.merchantId}</Detail>
    </Section>
    <Section title="Bank hisobi">
      <Detail label="Bank hisobi">{row.bankAccountName}</Detail>
      <Detail label="Bank hisobi ID">{row.bankAccountId}</Detail>
    </Section>
    <Section title="Joylashuv">
      <Detail label="Viloyat">{row.regionName ?? '—'}</Detail>
      <Detail label="Viloyat ID">{row.regionId ?? '—'}</Detail>
      <Detail label="Tuman">{row.districtName ?? '—'}</Detail>
      <Detail label="Tuman ID">{row.districtId ?? '—'}</Detail>
      <Detail label="Manzil">{row.address ?? '—'}</Detail>
    </Section>
    <Section title="Aloqa">
      <Detail label="Telefonlar">{row.phones.length > 0
        ? <ul className="space-y-1">{row.phones.map((phone, index) => <li key={index}>{formatUzbekPhoneDisplay(phone)}</li>)}</ul>
        : '—'}</Detail>
    </Section>
    <Section title="Statik QR">
      <Detail label="Statik QR ID">{row.staticQrId ?? '—'}</Detail>
      <Detail label="Statik QR havola">{link.kind === 'available' ? link.original : '—'}</Detail>
      {link.kind === 'available'
        ? <Button type="button" size="sm" onClick={() => onViewQr(row)}>Statik QR ko‘rish</Button>
        : <p role="status" className="text-sm text-text-secondary">Xavfsiz Statik QR havolasi mavjud emas.</p>}
    </Section>
  </div>
}

export function TerminalDetailsSheet({ row, onOpenChange, onViewQr }: {
  readonly row: TerminalRow | null; readonly onOpenChange: (open: boolean) => void
  readonly onViewQr: (row: TerminalRow) => void
}) {
  if (!row) return null
  return <Sheet open onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full max-w-full overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
      <SheetHeader className="border-b pr-14">
        <SheetTitle className="text-lg">Terminal tafsilotlari</SheetTitle>
        <SheetDescription className="break-all">{row.pkey}</SheetDescription>
      </SheetHeader>
      <TerminalDetailsContent row={row} onViewQr={onViewQr} />
    </SheetContent>
  </Sheet>
}
