import { useState, type ComponentProps, type ReactNode } from 'react'
import { CheckCircle2Icon, CopyIcon, ExternalLinkIcon, XIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from 'radix-ui'
import { SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { statusToneClasses, type StatusTone } from '@/shared/presentation/status-tone'

export const detailsSurfaceClasses = 'rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-2xl'
export const detailsCloseClasses = 'absolute right-5 top-5 z-10 size-10 rounded-full bg-brand-soft text-brand hover:bg-brand-soft/80'

export function DetailsDialogHeader({ icon: Icon, title, subtitle }: {
  readonly icon: LucideIcon; readonly title: string; readonly subtitle?: ReactNode
}) {
  return <header className="relative shrink-0 overflow-hidden px-5 pb-5 pt-7 pr-18 sm:px-6 sm:pr-20">
    <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 h-56 w-80 -rotate-12 rounded-[50%] bg-brand-soft/40" />
    <div className="relative flex min-w-0 items-center gap-4">
      <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand sm:size-16">
        <Icon className="size-7" />
      </span>
      <div className="min-w-0 space-y-1">
        <SheetTitle className="text-xl font-semibold text-text-primary sm:text-2xl">{title}</SheetTitle>
        <SheetDescription className="break-words text-sm text-text-secondary [overflow-wrap:anywhere] sm:text-base">{subtitle}</SheetDescription>
      </div>
    </div>
  </header>
}

export function DetailsDialogShell({ children, onOpenChange, onCloseAutoFocus, ...header }: {
  readonly children: ReactNode; readonly onOpenChange: (open: boolean) => void
  readonly onCloseAutoFocus?: ComponentProps<typeof Dialog.Content>['onCloseAutoFocus']
} & ComponentProps<typeof DetailsDialogHeader>) {
  return <Dialog.Root open onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay data-slot="details-dialog-overlay" className="fixed inset-0 z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-xs" />
      <Dialog.Content data-slot="details-dialog-content" onCloseAutoFocus={onCloseAutoFocus}
        className={cn(detailsSurfaceClasses, 'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[42rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden text-sm')}>
        <DetailsDialogHeader {...header} />
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" className={detailsCloseClasses} aria-label="Yopish"><XIcon aria-hidden="true" /></Button>
        </Dialog.Close>
        <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

export function DetailsBody({ children }: { readonly children: ReactNode }) {
  return <div className="min-w-0 space-y-3.5 px-5 pb-5 sm:px-6">{children}</div>
}

export function DetailsSectionCard({ title, icon: Icon, children, footer }: {
  readonly title: string; readonly icon: LucideIcon; readonly children: ReactNode; readonly footer?: ReactNode
}) {
  return <section aria-label={title} className="min-w-0 space-y-3 rounded-2xl border border-border/70 bg-surface/70 p-4">
    <h3 className="flex items-center gap-5 text-sm font-semibold uppercase text-text-primary">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon className="size-5" /></span>
      {title}
    </h3>
    <dl className="grid gap-3 sm:px-5">{children}</dl>
    {footer}
  </section>
}

export function DetailsFieldRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.85fr)] sm:items-start sm:gap-4">
    <dt className="text-sm leading-6 text-text-secondary">{label}</dt>
    <dd className="min-w-0 whitespace-pre-line break-words text-sm font-medium leading-6 text-text-primary [overflow-wrap:anywhere]">{children}</dd>
  </div>
}

export function DetailsStatusBadge({ status }: { readonly status: { readonly label: string; readonly tone: StatusTone } }) {
  return <span className={cn('inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-1 text-sm font-medium', statusToneClasses[status.tone].badge, 'border-transparent')}>
    {status.tone === 'success' ? <CheckCircle2Icon aria-hidden="true" className="size-5 shrink-0" />
      : <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', statusToneClasses[status.tone].indicator)} />}
    <span>{status.label}</span>
  </span>
}

export function DetailsCopyField({ value, onCopy, copyLabel = 'Havolani nusxalash', copyable = true }: {
  readonly value: string; readonly onCopy?: () => void; readonly copyLabel?: string; readonly copyable?: boolean
}) {
  const [feedback, setFeedback] = useState<string | null>(null)
  async function copy() {
    if (onCopy) { onCopy(); return }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setFeedback('Nusxalandi.')
    } catch { setFeedback('Nusxalab bo‘lmadi.') }
  }
  return <div className="min-w-0">
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/50 px-2.5 py-1">
      <span title={value} className="min-w-0 flex-1 break-all text-xs font-normal leading-5">{value}</span>
      {copyable ? <Button type="button" variant="ghost" size="icon-sm" aria-label={copyLabel} title={copyLabel} onClick={() => void copy()}><CopyIcon aria-hidden="true" /></Button> : null}
    </div>
    {feedback ? <span role="status" className="mt-1 block text-xs text-text-secondary">{feedback}</span> : null}
  </div>
}

export function DetailsPrimaryAction({ children, onClick }: { readonly children: ReactNode; readonly onClick: () => void }) {
  return <Button type="button" onClick={onClick} className="h-10 w-full gap-3 whitespace-normal rounded-xl"><ExternalLinkIcon aria-hidden="true" />{children}</Button>
}
