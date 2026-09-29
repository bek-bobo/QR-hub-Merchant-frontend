interface FilterDrawerHandlerOptions {
  readonly setOpen: (open: boolean) => void
  readonly onApply: () => boolean | void
  readonly onReset: () => void
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
}: FilterDrawerHandlerOptions): FilterDrawerHandlers {
  return {
    setOpen,
    apply: () => {
      if (onApply() !== false) {
        setOpen(false)
      }
    },
    reset: onReset,
  }
}
