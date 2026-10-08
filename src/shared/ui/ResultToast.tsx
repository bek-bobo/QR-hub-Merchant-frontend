import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Toast } from 'radix-ui'
import { CheckIcon, XIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { statusToneClasses } from '@/shared/presentation/status-tone'

interface ResultToastProps {
  readonly tone: 'success' | 'error'
  readonly title: string
  readonly description?: string
  readonly placement?: 'top-right' | 'below-header'
  readonly icon?: LucideIcon
  readonly action?: { readonly label: string; readonly onClick: () => void } | undefined
  readonly detail?: string | undefined
}

/** Lightweight notification using the application's existing Radix toolkit and semantic colors. */
export function ResultToast({ tone, title, description, detail, action, placement = 'top-right', icon }: ResultToastProps) {
  const [open, setOpen] = useState(true)
  const [paused, setPaused] = useState(false)
  const duration = tone === 'success' ? 6000 : 10000
  const accent = tone === 'success' ? 'bg-status-success-indicator' : 'bg-status-error-indicator'
  const Icon = icon ?? (tone === 'success' ? CheckIcon : XIcon)
  const viewport = <Toast.Viewport label="Bildirishnomalar ({hotkey})" className={`fixed right-4 z-[100] m-0 flex w-[calc(100vw-2rem)] max-w-[26rem] list-none flex-col gap-3 p-0 outline-none sm:right-6 ${placement === 'below-header' ? 'top-24' : 'top-4 sm:top-6'}`} />
  return <Toast.Provider label="Bildirishnoma" duration={duration} swipeDirection="right">
    <Toast.Root open={open} onOpenChange={setOpen} onPause={() => setPaused(true)} onResume={() => setPaused(false)}
      role={tone === 'success' ? 'status' : 'alert'}
      className="relative rounded-xl border border-border/70 bg-popover p-4 text-popover-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-4">
      <div className="flex items-start gap-3 pr-7">
        <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-white ${accent}`} aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <Toast.Title className="text-sm font-semibold">{title}</Toast.Title>
          {description ? <Toast.Description className="break-words text-sm text-text-secondary [overflow-wrap:anywhere]">{description}</Toast.Description> : null}
          {detail ? <p className="text-xs text-text-secondary">{detail}</p> : null}
          {action ? <Toast.Action asChild altText={action.label}>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={action.onClick}>{action.label}</Button>
          </Toast.Action> : null}
        </div>
      </div>
      <Toast.Close asChild>
        <Button type="button" variant="ghost" size="icon-sm" className="absolute right-2 top-2 text-text-secondary" aria-label="Bildirishnomani yopish"><XIcon className="size-4" aria-hidden="true" /></Button>
      </Toast.Close>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={`h-full origin-left rounded-full ${statusToneClasses[tone].indicator}`}
          style={{ animation: `result-toast-countdown ${duration}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }} />
      </div>
    </Toast.Root>
    {typeof document === 'undefined' ? null : createPortal(viewport, document.body)}
  </Toast.Provider>
}
