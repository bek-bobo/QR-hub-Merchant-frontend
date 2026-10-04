import type { ComponentProps, ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { MonitorIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CashierRow, CashierTerminal } from '@/shared/contracts/management-read'
import { MetadataId } from '@/shared/presentation/MetadataId'
import { formatUzbekPhoneDisplay } from '@/shared/presentation/phone'
import { statusToneClasses } from '@/shared/presentation/status-tone'
import { presentCashierTerminalStatus } from './status-presentation'

export type CashierTerminalsMode = 'view' | 'assign' | 'unassign'

interface CashierTerminalsContentProps {
  readonly cashier: CashierRow
  readonly mode?: CashierTerminalsMode
  readonly assignSurface?: ReactNode
  readonly onUnassign?: (terminal: CashierTerminal) => void
  readonly unassignSurface?: ReactNode
}

export function CashierTerminalsContent({ cashier, mode = 'view', assignSurface, onUnassign, unassignSurface }: CashierTerminalsContentProps) {
  return <div className="min-h-0 min-w-0 space-y-4 overflow-y-auto px-4 py-4 [overflow-wrap:anywhere] sm:px-6">
    {mode === 'assign' ? assignSurface : <section aria-label="Faol terminal biriktirishlari">
      {cashier.terminals.length === 0
        ? <div role="status" className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-text-secondary">
          <MonitorIcon className="mx-auto mb-3 size-8" aria-hidden="true" />
          Bu kassirga terminal biriktirilmagan.
        </div>
        : <ul className="space-y-3">{cashier.terminals.map((terminal, index) => {
          const status = presentCashierTerminalStatus(terminal.statusCode)
          return <li key={`${terminal.id}-${index}`} className="min-w-0 space-y-2 rounded-xl border bg-surface p-3">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <span className="min-w-0 flex-1 font-medium text-text-primary">{terminal.name}</span>
              <Badge variant="outline" className={statusToneClasses[status.tone].badge}>{status.label}</Badge>
            </div>
            <div className="min-w-0 text-xs text-text-secondary">Terminal ID:
              <MetadataId value={terminal.id} variant="secondary" className="mt-1 max-w-none whitespace-normal break-all overflow-visible text-clip" />
            </div>
            {mode === 'unassign' && onUnassign ? <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" aria-label={`${terminal.name} (${terminal.id}) terminalini ajratish`}
                onClick={() => onUnassign(terminal)}>Ajratish</Button>
            </div> : null}
          </li>
        })}</ul>}
    </section>}
    {mode === 'unassign' ? unassignSurface : null}
  </div>
}

export function CashierTerminalsDialog({ cashier, mode = 'view', onClose, onCloseAutoFocus, ...contentProps }: CashierTerminalsContentProps & {
  readonly onClose: () => void
  readonly onCloseAutoFocus?: ComponentProps<typeof Dialog.Content>['onCloseAutoFocus']
}) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 supports-backdrop-filter:backdrop-blur-xs" />
      <Dialog.Content onCloseAutoFocus={onCloseAutoFocus} className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl">
        <header className="shrink-0 border-b px-4 py-4 pr-14 sm:px-6">
          <Dialog.Title className="text-xl font-semibold text-text-primary">{mode === 'assign' ? 'Terminal qo‘shish' : mode === 'unassign' ? 'Terminal ajratish' : 'Biriktirilgan terminallar'}</Dialog.Title>
          <Dialog.Description className="mt-1 min-w-0 break-words text-sm text-text-secondary [overflow-wrap:anywhere]">
            <span className="block font-medium text-text-primary">{cashier.fullname}</span>
            <span className="block">{formatUzbekPhoneDisplay(cashier.phone) || '—'}</span>
          </Dialog.Description>
        </header>
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" size="icon-sm" className="absolute right-4 top-4" aria-label="Yopish">
            <XIcon aria-hidden="true" />
          </Button>
        </Dialog.Close>
        <CashierTerminalsContent cashier={cashier} mode={mode} {...contentProps} />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
