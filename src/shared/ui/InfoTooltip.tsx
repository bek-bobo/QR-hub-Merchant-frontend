import { useRef, useState } from 'react'
import { Tooltip } from 'radix-ui'
import { InfoIcon } from 'lucide-react'

/** Explanatory text only; Radix owns hover, focus, dismissal and positioning. */
export function InfoTooltip({ label, text }: { readonly label: string; readonly text: string }) {
  const [open, setOpen] = useState(false)
  const pinned = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)
  function dismiss() { pinned.current = false; setOpen(false) }
  return <Tooltip.Provider delayDuration={200}>
    <Tooltip.Root open={open} onOpenChange={(next) => {
      if (!next && pinned.current) return
      setOpen(next)
    }}>
      <Tooltip.Trigger asChild>
        <button ref={trigger} type="button" aria-label={label}
          className="-m-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(event) => {
            // Keep tap/keyboard activation open until dismissed. Prevent Radix's
            // default click-to-close, which otherwise defeats the tap toggle.
            event.preventDefault()
            pinned.current = !pinned.current
            setOpen(pinned.current)
          }}
          onBlur={dismiss}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && open) {
              event.preventDefault(); event.stopPropagation(); dismiss()
            }
          }}>
          <InfoIcon className="size-4" aria-hidden="true" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="top" sideOffset={8} collisionPadding={12}
          data-slot="info-tooltip-content"
          className="z-[110] max-w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-popover px-3 py-2 text-sm leading-5 text-popover-foreground shadow-lg [overflow-wrap:anywhere]"
          onEscapeKeyDown={(event) => { event.preventDefault(); dismiss() }}
          onPointerDownOutside={(event) => {
            if (event.target instanceof Node && trigger.current?.contains(event.target)) return
            dismiss()
          }}>
          {text}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
}
