import { useRef } from 'react'
import { DropdownMenu as Menu } from 'radix-ui'
import { MonitorIcon, MoreHorizontalIcon, PlusIcon, MinusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CashierRow } from '@/shared/contracts/management-read'

type RowAction = (row: CashierRow, trigger: HTMLButtonElement | null) => void

interface CashierActionsMenuProps {
  readonly row: CashierRow
  readonly onViewTerminals: RowAction
  readonly onAssign?: RowAction
  readonly onUnassign?: RowAction
}

const itemClassName = 'flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted data-[highlighted]:text-text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50'

export function CashierActionsMenu({ row, onViewTerminals, onAssign, onUnassign }: CashierActionsMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null)
  const openingDialog = useRef(false)
  function open(action: RowAction) {
    openingDialog.current = true
    action(row, trigger.current)
  }
  const canUnassign = Boolean(onUnassign && row.terminals.length)
  return <Menu.Root>
    <Menu.Trigger asChild>
      <Button ref={trigger} type="button" variant="outline" size="icon-sm"
        className="size-9 rounded-lg bg-muted/30"
        aria-label={`${row.fullname} uchun amallarni ochish`}>
        <MoreHorizontalIcon aria-hidden="true" />
      </Button>
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Content align="end" sideOffset={6} className="z-50 min-w-52 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        onCloseAutoFocus={(event) => {
          if (openingDialog.current) { event.preventDefault(); openingDialog.current = false }
        }}>
        <Menu.Item className={itemClassName} onSelect={() => open(onViewTerminals)}>
          <MonitorIcon className="size-4" aria-hidden="true" />Faol terminallar · {row.terminals.length}
        </Menu.Item>
        <Menu.Item className={itemClassName} disabled={!onAssign} onSelect={onAssign ? () => open(onAssign) : undefined}>
          <PlusIcon className="size-4" aria-hidden="true" />Terminal qo‘shish
        </Menu.Item>
        <Menu.Item className={itemClassName} disabled={!canUnassign} onSelect={canUnassign && onUnassign ? () => open(onUnassign) : undefined}>
          <MinusIcon className="size-4" aria-hidden="true" />Terminal ajratish
        </Menu.Item>
      </Menu.Content>
    </Menu.Portal>
  </Menu.Root>
}
