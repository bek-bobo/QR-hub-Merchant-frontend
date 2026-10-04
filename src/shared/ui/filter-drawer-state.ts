interface FilterDrawerHandlerOptions {
  readonly setOpen: (open: boolean) => void
  readonly onApply: () => boolean | void
  readonly onReset: () => void
  readonly onOpenChange?: (open: boolean) => void
}

export interface FilterDrawerHandlers {
  readonly setOpen: (open: boolean) => void
  readonly apply: () => void
  readonly reset: () => void
}

export function createFilterDrawerHandlers({
  setOpen,
  onApply,
  onReset,
  onOpenChange,
}: FilterDrawerHandlerOptions): FilterDrawerHandlers {
  function changeOpen(open: boolean) {
    setOpen(open)
    onOpenChange?.(open)
  }

  return {
    setOpen: changeOpen,
    apply: () => {
      if (onApply() !== false) {
        changeOpen(false)
      }
    },
    reset: onReset,
  }
}
