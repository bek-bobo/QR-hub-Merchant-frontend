import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

export function P5DetailsContent({ row, onViewQr }: P5DetailsContentProps) {
  const link = presentQrLink(row.staticQrLink)
  return <div className="min-w-0 space-y-4 px-4 pb-6 sm:px-5">
    <Section title="Qurilma">
      <Detail label="Qurilma ID"><MetadataId value={row.deviceId} /></Detail>
      <Detail label="Tavsif">{row.description ?? '—'}</Detail>
      <Detail label="Qurilma holati">{presentP5Status(row.deviceStatus).label}</Detail>
      <Detail label="Yaratilgan">{formatOffsetlessDateTime(row.createdAt)}</Detail>
    </Section>
    <Section title="Terminal">
      <Detail label="Terminal">{row.terminalName}</Detail>
      <Detail label="Terminal ID"><MetadataId value={row.terminalId} /></Detail>
      <Detail label="Terminal turi">{row.terminalType}</Detail>
    </Section>
    <Section title="Merchant">
      <Detail label="Merchant">{row.merchantName}</Detail>
    </Section>
    <Section title="Statik QR">
      <Detail label="Statik QR ID">{row.staticQrId ?? '—'}</Detail>
      <Detail label="Statik QR holati">{presentActiveStatus(row.staticQrStatus ?? -1).label}</Detail>
      <Detail label="Statik QR havola">{link.kind === 'available' ? link.original : '—'}</Detail>
      {link.kind === 'available'
        ? <Button type="button" size="sm" onClick={() => onViewQr(row)}>Statik QR ko‘rish</Button>
        : <p role="status" className="text-sm text-text-secondary">Xavfsiz Statik QR havolasi mavjud emas.</p>}
    </Section>
  </div>
}

export function P5DetailsSheet({ row, onOpenChange, onViewQr }: {
  readonly row: P5Row | null; readonly onOpenChange: (open: boolean) => void
  readonly onViewQr: (row: P5Row) => void
}) {
  if (!row) return null
  return <Sheet open onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full max-w-full overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
      <SheetHeader className="border-b pr-14">
        <SheetTitle className="text-lg">P5 qurilma tafsilotlari</SheetTitle>
        <SheetDescription className="break-all">{row.deviceId}</SheetDescription>
      </SheetHeader>
      <P5DetailsContent row={row} onViewQr={onViewQr} />
    </SheetContent>
  </Sheet>
}
