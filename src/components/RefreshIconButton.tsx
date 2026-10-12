import { useMessages } from '@/shared/i18n/useMessages'
import type { ComponentProps } from 'react'
import { RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RefreshIconButtonProps = Omit<
  ComponentProps<typeof Button>,
  "aria-label" | "children"
> & {
  updatedTime: string;
  loading?: boolean;
};

export function RefreshIconButton({
  updatedTime,
  loading = false,
  className,
  disabled,
  size,
  ...props
}: RefreshIconButtonProps) {
  const { message } = useMessages('common')
  return (
    <span className="group relative inline-flex shrink-0">
      <Button
        {...props}
        type={props.type ?? "button"}
        variant={props.variant ?? "outline"}
        size={size ?? 'icon-sm'}
        aria-label={message('actions.refresh')}
        disabled={disabled || loading}
        className={className}
      >
        <RefreshCwIcon
          aria-hidden="true"
          className={cn("size-4", loading && "animate-spin")}
        />
      </Button>

      <span
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-[calc(100%+0.375rem)] z-50 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {message('refresh.updated', { time: updatedTime })}
      </span>
    </span>
  );
}
