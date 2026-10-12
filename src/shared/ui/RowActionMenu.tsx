import { useMessages } from '@/shared/i18n/useMessages'
import type { ComponentProps, ReactNode, Ref } from 'react'
import { DropdownMenu as Menu } from 'radix-ui'
import { MoreHorizontalIcon, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RowActionMenuProps {
  readonly children: ReactNode
  readonly label?: string
  readonly triggerRef?: Ref<HTMLButtonElement>
  readonly contentProps?: Omit<ComponentProps<typeof Menu.Content>, 'children'>
}

export function RowActionMenu({ children, label, triggerRef, contentProps }: RowActionMenuProps) {
  const { message } = useMessages('common')
  return <Menu.Root>
    <Menu.Trigger asChild>
      <Button ref={triggerRef} type="button" variant="outline" size="icon-sm"
        className="size-10 rounded-xl border-border/70 bg-muted/30 text-text-secondary hover:border-brand/25 hover:bg-brand-soft hover:text-brand focus-visible:ring-ring data-[state=open]:border-brand/25 data-[state=open]:bg-brand-soft data-[state=open]:text-brand"
        aria-label={label ?? message('actions.openMenu')}>
        <MoreHorizontalIcon className="size-4" aria-hidden="true" />
      </Button>
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Content align="end" sideOffset={8} collisionPadding={12} avoidCollisions
        {...contentProps}
        className={cn('z-50 w-max min-w-[min(15rem,var(--radix-dropdown-menu-content-available-width))] max-w-[min(20rem,var(--radix-dropdown-menu-content-available-width))] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto rounded-2xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-xl outline-none', contentProps?.className)}>
        {children}
      </Menu.Content>
    </Menu.Portal>
  </Menu.Root>
}

interface RowActionItemProps extends ComponentProps<typeof Menu.Item> {
  readonly icon: LucideIcon
  readonly destructive?: boolean
}

export function RowActionItem({ icon: Icon, destructive = false, children, className, ...props }: RowActionItemProps) {
  return <Menu.Item {...props} className={cn(
    'group flex min-h-12 cursor-pointer select-none items-center gap-3 rounded-xl px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:cursor-default data-[disabled]:opacity-45',
    destructive ? 'text-destructive data-[highlighted]:bg-destructive/10' : 'text-text-primary data-[highlighted]:bg-brand-soft',
    className,
  )}>
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
      destructive ? 'text-destructive group-data-[highlighted]:bg-destructive/10' : 'text-text-secondary group-data-[highlighted]:bg-brand/5 group-data-[highlighted]:text-brand')}>
      <Icon className="size-5" aria-hidden="true" />
    </span>
    <span className="min-w-0 break-words leading-5">{children}</span>
  </Menu.Item>
}

export function RowActionSeparator() {
  return <Menu.Separator className="mx-2 my-1 h-px bg-border/60" />
}

export function RowActionHint({ children }: { readonly children: ReactNode }) {
  return <p className="max-w-64 px-3 pb-2 pt-1 text-xs leading-5 text-text-secondary">{children}</p>
}
