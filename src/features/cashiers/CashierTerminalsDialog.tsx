import type { ComponentProps, ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { MonitorIcon, UsersRoundIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CashierRow, CashierTerminal } from '@/shared/contracts/management-read'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { formatUzbekPhoneDisplay } from '@/shared/presentation/phone'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { presentCashierTerminalStatus } from './status-presentation'
import { DetailsBody, DetailsDialogShell, DetailsFieldRow, DetailsSectionCard, DetailsStatusBadge } from '@/shared/ui/DetailsDialog'

export type CashierTerminalsMode = 'view' | 'assign' | 'unassign'

interface CashierTerminalsContentProps {
  readonly cashier: CashierRow
  readonly mode?: CashierTerminalsMode
  readonly assignSurface?: ReactNode
  readonly onUnassign?: (terminal: CashierTerminal) => void
  readonly unassignSurface?: ReactNode
}

function cashierInitials(fullname: string): string {
  const parts = fullname.trim().split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : parts[0]?.slice(0, 2) || '—').toLocaleUpperCase('uz-UZ')
}

function CashierIdentity({ cashier, compact = false }: { readonly cashier: CashierRow; readonly compact?: boolean }) {
  const details = <>
    <span className="min-w-0 font-semibold text-text-primary">{cashier.fullname}</span>
    <span className="min-w-0 text-sm text-text-secondary">{formatUzbekPhoneDisplay(cashier.phone) || '—'}</span>
  </>
  if (compact) return <span className="flex min-w-0 flex-col gap-0.5">{details}</span>
  return <div className="flex min-w-0 items-center gap-4 border-b border-border/70 pb-4">
    <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">
      {cashierInitials(cashier.fullname)}
    </span>
    <div className="flex min-w-0 flex-col gap-0.5">{details}</div>
  </div>
}

function TerminalStatusBadge({ terminal }: { readonly terminal: CashierTerminal }) {
  const status = presentCashierTerminalStatus(terminal.statusCode)
  return <Badge variant="outline" className={`gap-2 rounded-full px-3 py-1 ${statusToneClasses[status.tone].badge}`}>
    <span aria-hidden="true" className={`size-2 rounded-full ${statusToneClasses[status.tone].indicator}`} />
    {status.label}
  </Badge>
}

function TerminalCard({ terminal, onUnassign }: { readonly terminal: CashierTerminal; readonly onUnassign?: ((terminal: CashierTerminal) => void) | undefined }) {
  return <li className="min-w-0 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
    <div className="flex min-w-0 flex-wrap items-center gap-4">
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <MonitorIcon className="size-6" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold text-text-primary">{terminal.name}</p>
        <div className="text-xs text-text-secondary">Terminal ID:
          <MetadataId value={terminal.id} variant="secondary" className="mt-1 max-w-none whitespace-normal break-all overflow-visible text-clip" />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-3 border-l border-border/70 pl-4">
        <TerminalStatusBadge terminal={terminal} />
        {onUnassign ? <Button type="button" variant="outline" size="sm"
          className="border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={`${terminal.name} (${terminal.id}) terminalini ajratish`}
          onClick={() => onUnassign(terminal)}>Ajratish</Button> : null}
      </div>
    </div>
  </li>
}

export function CashierTerminalsContent({ cashier, mode = 'view', assignSurface, onUnassign, unassignSurface }: CashierTerminalsContentProps) {
  if (mode === 'view') return <DetailsBody>
    <DetailsSectionCard title="Kassir" icon={UsersRoundIcon}>
      <DetailsFieldRow label="Kassir"><CashierIdentity cashier={cashier} /></DetailsFieldRow>
    </DetailsSectionCard>
    <section aria-label="Faol terminal biriktirishlari" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase text-text-primary">Biriktirilgan terminallar</h3>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-text-primary">{cashier.terminals.length} ta terminal</span>
      </div>
      {cashier.terminals.length === 0
        ? <p role="status" className="rounded-2xl border border-dashed p-6 text-center text-sm text-text-secondary">Bu kassirga terminal biriktirilmagan.</p>
        : <ul className="space-y-3">{cashier.terminals.map((terminal, index) => <li key={`${terminal.id}-${index}`}>
          <DetailsSectionCard title={terminal.name} icon={MonitorIcon}>
            <DetailsFieldRow label="Terminal ID"><MetadataId value={terminal.id} className="max-w-none whitespace-normal break-all overflow-visible text-clip" /></DetailsFieldRow>
            <DetailsFieldRow label="Holat"><DetailsStatusBadge status={presentCashierTerminalStatus(terminal.statusCode)} /></DetailsFieldRow>
          </DetailsSectionCard>
        </li>)}</ul>}
    </section>
  </DetailsBody>
  return <div className="min-h-0 min-w-0 space-y-4 overflow-y-auto px-5 py-5 [overflow-wrap:anywhere] sm:px-8">
    {mode !== 'assign' ? <CashierIdentity cashier={cashier} /> : null}
    {mode === 'assign' ? assignSurface : <section aria-label="Faol terminal biriktirishlari" className="space-y-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          <MonitorIcon className="size-4" aria-hidden="true" />
          {mode === 'unassign' ? 'Ajratiladigan terminal' : 'Biriktirilgan terminallar'}
        </h3>
      </div>
      {cashier.terminals.length === 0
        ? <div role="status" className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-text-secondary">
          <MonitorIcon className="mx-auto mb-3 size-8" aria-hidden="true" />
          Bu kassirga terminal biriktirilmagan.
        </div>
        : <ul className="space-y-3">{cashier.terminals.map((terminal, index) =>
          <TerminalCard key={`${terminal.id}-${index}`} terminal={terminal}
            onUnassign={mode === 'unassign' ? onUnassign : undefined} />)}</ul>}
    </section>}
    {mode === 'unassign' ? unassignSurface : null}
  </div>
}

export function CashierTerminalsDialog({ cashier, mode = 'view', onClose, onCloseAutoFocus, ...contentProps }: CashierTerminalsContentProps & {
  readonly onClose: () => void
  readonly onCloseAutoFocus?: ComponentProps<typeof Dialog.Content>['onCloseAutoFocus']
}) {
  const title = mode === 'assign' ? 'Terminal qo‘shish' : mode === 'unassign' ? 'Terminal ajratish' : 'Biriktirilgan terminallar'
  const subtitle = mode === 'unassign' ? 'Ushbu terminalni kassirdan ajratishingiz mumkin.'
    : 'Ushbu kassirga hozirda biriktirilgan faol terminallar ro‘yxati.'
  if (mode === 'view') return <DetailsDialogShell title={title} subtitle={subtitle} icon={UsersRoundIcon}
    onCloseAutoFocus={onCloseAutoFocus} onOpenChange={(open) => { if (!open) onClose() }}>
    <CashierTerminalsContent cashier={cashier} mode={mode} {...contentProps} />
  </DetailsDialogShell>
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-xs" />
      <Dialog.Content onCloseAutoFocus={onCloseAutoFocus} className={`fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-2xl ${mode === 'assign' ? 'max-w-xl' : 'max-w-2xl'}`}>
        <header className="relative shrink-0 overflow-hidden border-b border-border/70 px-5 py-5 pr-16 sm:px-8">
          <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 size-56 rounded-full bg-brand-soft/50" />
          <div className="relative flex min-w-0 items-start gap-4">
            <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <UsersRoundIcon className="size-6" />
            </span>
            <div className="min-w-0 space-y-1">
              <Dialog.Title className="text-xl font-semibold text-text-primary">{title}</Dialog.Title>
              <Dialog.Description className="min-w-0 break-words text-sm text-text-secondary [overflow-wrap:anywhere]">
                {mode === 'assign' ? <CashierIdentity cashier={cashier} compact /> : subtitle}
              </Dialog.Description>
            </div>
          </div>
        </header>
        <Dialog.Close asChild>
          <Button type="button" variant="outline" size="icon-sm" className="absolute right-5 top-5 z-10 rounded-full bg-card/80" aria-label="Yopish">
            <XIcon aria-hidden="true" />
          </Button>
        </Dialog.Close>
        <CashierTerminalsContent cashier={cashier} mode={mode} {...contentProps} />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
